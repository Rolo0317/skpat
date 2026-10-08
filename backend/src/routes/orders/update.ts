import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { PAYMENT_METHODS } from '../../services/sales.js'
import { ORDER_TRANSITION_TARGETS, transitionOrder } from '../../services/tableOrders.js'
import { parseOrThrow } from '../../services/validation.js'

const updateOrderSchema = z.object({
  status: z.enum(ORDER_TRANSITION_TARGETS),
  payment_method: z.enum(PAYMENT_METHODS).optional(),
})

export async function updateOrderRoute(app: FastifyInstance) {
  app.patch('/:id', { preHandler: [verifyAuth, requireRole('mesero', 'admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status, payment_method } = parseOrThrow(updateOrderSchema, req.body)
    const result = await transitionOrder(id, { status, paymentMethod: payment_method, staffId: req.user!.id })
    return reply.send(result)
  })
}
