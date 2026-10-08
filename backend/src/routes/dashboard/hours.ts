import type { FastifyInstance } from 'fastify'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { periodStart } from '../../services/businessHours.js'
import { findRevenueByHour, type HourlyRevenue } from '../../services/salesReports.js'

const HOURS_PER_DAY = 24
const HOUR_LABEL_LENGTH = 2

const centsByHour = (rows: HourlyRevenue[]) => new Map(rows.map((row) => [row.hour, row.total_cents]))

export async function hoursRoute(app: FastifyInstance) {
  // Gráfica de la noche: ingresos por hora local de Bogotá desde las 18:00.
  app.get('/hours', { preHandler: [verifyAuth, requireRole('admin')] }, async (_req, reply) => {
    const since = await periodStart('tonight')
    const [salesRows, ticketRows] = await Promise.all([findRevenueByHour('sales', since), findRevenueByHour('tickets', since)])
    const sales = centsByHour(salesRows)
    const tickets = centsByHour(ticketRows)

    const hours = Array.from({ length: HOURS_PER_DAY }, (_, hour) => {
      const salesCents = sales.get(hour) ?? 0
      const ticketCents = tickets.get(hour) ?? 0
      return {
        hour: String(hour).padStart(HOUR_LABEL_LENGTH, '0'),
        sales_cents: salesCents,
        ticket_cents: ticketCents,
        total_cents: salesCents + ticketCents,
      }
    })
    return reply.send({ hours })
  })
}
