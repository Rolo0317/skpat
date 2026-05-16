import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'

const saleItemSchema = z.object({
  menu_item_id: z.string().min(1),
  quantity: z.number().int().positive().default(1),
})

const createSaleSchema = z.object({
  table_number: z.number().int().positive().optional(),
  payment_method: z.enum(['efectivo', 'nequi', 'transferencia']).default('efectivo'),
  items: z.array(saleItemSchema).min(1),
  notes: z.string().max(300).optional(),
})

export async function createSaleRoute(app: FastifyInstance) {
  app.post('/', { preHandler: [verifyAuth, requireRole('mesero', 'admin')] }, async (req, reply) => {
    const parsed = createSaleSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues })

    const { table_number, payment_method, items, notes } = parsed.data
    const mesero_id = req.user!.id

    const createTx = db.transaction(() => {
      // Resolve table_id from table_number if provided
      let table_id: string | null = null
      if (table_number) {
        const t = db.prepare('SELECT id FROM tables WHERE number = ? AND is_active = 1').get(table_number) as { id: string } | undefined
        table_id = t?.id ?? null
      }

      // Fetch menu items and compute totals
      let total_cents = 0
      const resolvedItems = items.map(item => {
        const mi = db.prepare(
          'SELECT id, name, price_cents, is_active, stock_qty FROM menu_items WHERE id = ?'
        ).get(item.menu_item_id) as { id: string; name: string; price_cents: number; is_active: number; stock_qty: number } | undefined

        if (!mi) throw Object.assign(new Error('MenuItemNotFound'), { statusCode: 404, item_id: item.menu_item_id })
        if (!mi.is_active) throw Object.assign(new Error('MenuItemInactive'), { statusCode: 422, item_id: item.menu_item_id })

        const subtotal = mi.price_cents * item.quantity
        total_cents += subtotal

        // Decrement stock_qty if tracked (>= 0)
        if (mi.stock_qty >= 0) {
          db.prepare(
            'UPDATE menu_items SET stock_qty = MAX(0, stock_qty - ?) WHERE id = ?'
          ).run(item.quantity, mi.id)
        }

        return { menu_item_id: mi.id, item_name: mi.name, item_price_cents: mi.price_cents, quantity: item.quantity, subtotal_cents: subtotal }
      })

      // Insert sale
      const sale = db.prepare(`
        INSERT INTO sales (mesero_id, table_id, table_number, payment_method, total_cents, notes)
        VALUES (@mesero_id, @table_id, @table_number, @payment_method, @total_cents, @notes)
        RETURNING id
      `).get({ mesero_id, table_id, table_number: table_number ?? null, payment_method, total_cents, notes: notes ?? null }) as { id: string }

      // Insert sale_items
      const insertItem = db.prepare(`
        INSERT INTO sale_items (sale_id, menu_item_id, item_name, item_price_cents, quantity, subtotal_cents)
        VALUES (@sale_id, @menu_item_id, @item_name, @item_price_cents, @quantity, @subtotal_cents)
      `)
      for (const item of resolvedItems) {
        insertItem.run({ sale_id: sale.id, ...item })
      }

      return { sale_id: sale.id, total_cents, item_count: resolvedItems.length }
    })

    try {
      const result = createTx()
      return reply.code(201).send(result)
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string; item_id?: string }
      if (e.statusCode === 404) return reply.code(404).send({ error: 'MenuItemNotFound', item_id: e.item_id })
      if (e.statusCode === 422) return reply.code(422).send({ error: 'MenuItemInactive', item_id: e.item_id })
      throw err
    }
  })
}
