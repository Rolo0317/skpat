import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { listOrdersByStatus, ORDER_STATUSES } from '../../services/tableOrders.js'
import { parseOrThrow } from '../../services/validation.js'

const listOrdersQuerySchema = z.object({ status: z.enum(ORDER_STATUSES).default('pending') })

export async function listOrdersRoute(app: FastifyInstance) {
  app.get('/', { preHandler: [verifyAuth, requireRole('mesero', 'admin')] }, async (req, reply) => {
    const { status } = parseOrThrow(listOrdersQuerySchema, req.query)
    return reply.send(await listOrdersByStatus(status))
  })
}
