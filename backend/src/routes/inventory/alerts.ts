import type { FastifyInstance } from 'fastify'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { findStockAlerts } from '../../services/inventory.js'

export async function stockAlertsRoute(app: FastifyInstance) {
  app.get('/alerts', { preHandler: [verifyAuth, requireRole('admin')] }, async (_req, reply) => {
    const alerts = await findStockAlerts()
    return reply.send({ count: alerts.length, items: alerts })
  })
}
