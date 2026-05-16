import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'

const updateMenuItemSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(300).optional(),
  category: z.string().trim().min(1).max(50).optional(),
  price_cents: z.number().int().nonnegative().optional(),
  sort_order: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
})

export async function updateMenuItemRoute(app: FastifyInstance) {
  app.put('/:id', { preHandler: [verifyAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = updateMenuItemSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues })

    const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id)
    if (!existing) return reply.code(404).send({ error: 'MenuItemNotFound' })

    const data = parsed.data
    db.prepare(`
      UPDATE menu_items SET
        name = COALESCE(@name, name),
        description = COALESCE(@description, description),
        category = COALESCE(@category, category),
        price_cents = COALESCE(@price_cents, price_cents),
        sort_order = COALESCE(@sort_order, sort_order),
        is_active = COALESCE(@is_active, is_active),
        updated_at = unixepoch()
      WHERE id = @id
    `).run({
      id,
      name: data.name ?? null,
      description: data.description ?? null,
      category: data.category ?? null,
      price_cents: data.price_cents ?? null,
      sort_order: data.sort_order ?? null,
      is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : null,
    })

    const updated = db.prepare('SELECT id, name, description, category, price_cents, sort_order, is_active FROM menu_items WHERE id = ?').get(id)
    return reply.send(updated)
  })
}
