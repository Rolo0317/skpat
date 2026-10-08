import type { FastifyInstance } from 'fastify'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { businessDateToday, periodStart } from '../../services/businessHours.js'
import { findSalesByMesero } from '../../services/salesReports.js'

export async function tonightSalesRoute(app: FastifyInstance) {
  app.get('/tonight', { preHandler: [verifyAuth, requireRole('admin')] }, async (_req, reply) => {
    const meseros = await findSalesByMesero(await periodStart('tonight'))
    const byMesero = meseros.map(({ email, ...mesero }) => ({ ...mesero, mesero_email: email }))
    const grandTotalCents = meseros.reduce((sum, mesero) => sum + mesero.total_cents, 0)
    return reply.send({ by_mesero: byMesero, grand_total_cents: grandTotalCents, date: businessDateToday() })
  })
}
