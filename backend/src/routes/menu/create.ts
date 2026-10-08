import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { parseOrThrow } from '../../services/validation.js'

const createMenuItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(300).optional(),
  category: z.string().trim().min(1).max(50).default('general'),
  price_cents: z.number().int().nonnegative(),
  sort_order: z.number().int().nonnegative().default(0),
})

export async function createMenuItemRoute(app: FastifyInstance) {
  app.post('/', { preHandler: [verifyAuth, requireRole('admin')] }, async (req, reply) => {
    const { name, description, category, price_cents, sort_order } = parseOrThrow(createMenuItemSchema, req.body)
    const item = await db.one(
      `insert into menu_items (name, description, category, price_cents, sort_order)
       values ($1, $2, $3, $4, $5)
       returning id, name, description, category, price_cents, sort_order, is_active`,
      [name, description ?? null, category, price_cents, sort_order],
    )
    return reply.code(201).send(item)
  })
}
