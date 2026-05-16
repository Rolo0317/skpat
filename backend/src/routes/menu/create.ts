import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'

const createMenuItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(300).optional(),
  category: z.string().trim().min(1).max(50).default('general'),
  price_cents: z.number().int().nonnegative(),
  sort_order: z.number().int().nonnegative().default(0),
})

export async function createMenuItemRoute(app: FastifyInstance) {
  app.post('/', { preHandler: [verifyAuth, requireRole('admin')] }, async (req, reply) => {
    const parsed = createMenuItemSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues })
    const { name, description, category, price_cents, sort_order } = parsed.data
    const row = db.prepare(`
      INSERT INTO menu_items (name, description, category, price_cents, sort_order)
      VALUES (@name, @description, @category, @price_cents, @sort_order)
      RETURNING id, name, description, category, price_cents, sort_order, is_active
    `).get({ name, description: description ?? null, category, price_cents, sort_order })
    return reply.code(201).send(row)
  })
}
