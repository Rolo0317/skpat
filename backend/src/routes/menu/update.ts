import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { isUuid } from '../../lib/ids.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { parseOrThrow } from '../../services/validation.js'
import { stockLevelsSchema } from '../../services/inventory.js'

const updateMenuItemSchema = stockLevelsSchema.extend({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(300).optional(),
  category: z.string().trim().min(1).max(50).optional(),
  price_cents: z.number().int().nonnegative().optional(),
  sort_order: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
})

type MenuItemChanges = z.infer<typeof updateMenuItemSchema>

/** Un solo UPDATE: los campos ausentes (null) conservan su valor actual. */
function applyChanges(id: string, changes: MenuItemChanges) {
  return db.one(
    `update menu_items set
        name = coalesce($2, name),
        description = coalesce($3, description),
        category = coalesce($4, category),
        price_cents = coalesce($5, price_cents),
        sort_order = coalesce($6, sort_order),
        is_active = coalesce($7, is_active),
        stock_qty = coalesce($8, stock_qty),
        min_stock = coalesce($9, min_stock),
        updated_at = now()
      where id = $1
      returning id, name, description, category, price_cents, sort_order, is_active, stock_qty, min_stock`,
    [
      id, changes.name ?? null, changes.description ?? null, changes.category ?? null, changes.price_cents ?? null,
      changes.sort_order ?? null, changes.is_active ?? null, changes.stock_qty ?? null, changes.min_stock ?? null,
    ],
  )
}

export async function updateMenuItemRoute(app: FastifyInstance) {
  app.put('/:id', { preHandler: [verifyAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const changes = parseOrThrow(updateMenuItemSchema, req.body)
    const updated = isUuid(id) ? await applyChanges(id, changes) : undefined
    if (!updated) return reply.code(404).send({ error: 'MenuItemNotFound' })
    return reply.send(updated)
  })
}
