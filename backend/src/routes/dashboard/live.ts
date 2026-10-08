import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { periodStart } from '../../services/businessHours.js'
import { findStockAlerts } from '../../services/inventory.js'
import { findRevenueTotals, findTopSellingItems, revenueSince } from '../../services/salesReports.js'
import { countOpenOrders } from '../../services/tableOrders.js'

const LIVE_TOP_ITEMS_LIMIT = 5

/** Asistentes dentro: tiquetes escaneados en puerta desde que abrió la noche. */
async function countAttendeesInside(nightStart: Date): Promise<number> {
  const row = await db.one<{ count: number }>('select count(*) as count from tickets where qr_used_at >= $1', [nightStart])
  return row!.count
}

export async function liveRoute(app: FastifyInstance) {
  // Pulso de la noche en curso: una consulta por concepto, en paralelo.
  app.get('/live', { preHandler: [verifyAuth, requireRole('admin')] }, async (_req, reply) => {
    const [nightStart, dayStart] = await Promise.all([periodStart('tonight'), periodStart('today')])

    const [sales, tickets, attendeesInside, topItems, tableOrders, stockAlerts] = await Promise.all([
      findRevenueTotals('sales', revenueSince('sales', nightStart)),
      findRevenueTotals('tickets', revenueSince('tickets', dayStart)),
      countAttendeesInside(nightStart),
      findTopSellingItems(nightStart, LIVE_TOP_ITEMS_LIMIT),
      countOpenOrders(),
      findStockAlerts(),
    ])

    return reply.send({
      night_start: nightStart,
      sales_tonight: sales,
      tickets_today: tickets,
      attendees_inside: attendeesInside,
      top_items: topItems,
      table_orders: tableOrders,
      stock_alerts: { count: stockAlerts.length, items: stockAlerts },
    })
  })
}
