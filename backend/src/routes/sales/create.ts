import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { menuLineSchema } from '../../services/menu.js'
import { createSale, PAYMENT_METHODS } from '../../services/sales.js'
import { parseOrThrow } from '../../services/validation.js'

const createSaleSchema = z.object({
  table_number: z.number().int().positive().optional(),
  payment_method: z.enum(PAYMENT_METHODS).default('efectivo'),
  items: z.array(menuLineSchema).min(1),
  notes: z.string().max(300).optional(),
})

export async function createSaleRoute(app: FastifyInstance) {
  app.post('/', { preHandler: [verifyAuth, requireRole('mesero', 'admin')] }, async (req, reply) => {
    const input = parseOrThrow(createSaleSchema, req.body)
    const sale = await createSale(db, {
      meseroId: req.user!.id,
      paymentMethod: input.payment_method,
      items: input.items,
      tableNumber: input.table_number,
      notes: input.notes,
    })
    return reply.code(201).send(sale)
  })
}
