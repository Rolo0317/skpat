import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'

function periodBounds(period: string): { start: number; label: string } {
  const now = new Date()
  switch (period) {
    case 'tonight': {
      const start = new Date(now)
      start.setUTCHours(0, 0, 0, 0)
      return { start: Math.floor(start.getTime() / 1000), label: 'tonight' }
    }
    case 'week': {
      const start = new Date(now)
      start.setUTCDate(start.getUTCDate() - 6)
      start.setUTCHours(0, 0, 0, 0)
      return { start: Math.floor(start.getTime() / 1000), label: 'week' }
    }
    case 'month': {
      const start = new Date(now)
      start.setUTCDate(1)
      start.setUTCHours(0, 0, 0, 0)
      return { start: Math.floor(start.getTime() / 1000), label: 'month' }
    }
    default:
      return { start: 0, label: 'all' }
  }
}

export async function dashboardRoutes(app: FastifyInstance) {

  // GET /dashboard/summary?period=tonight|week|month&mesero_id=&menu_item_id=&hour=HH&event_id=
  app.get('/summary', { preHandler: [verifyAuth, requireRole('admin')] }, async (req, reply) => {
    const { period = 'tonight', mesero_id, menu_item_id, hour, event_id } = req.query as {
      period?: string; mesero_id?: string; menu_item_id?: string; hour?: string; event_id?: string
    }
    const { start, label } = periodBounds(period)

    // Sales (mesa) revenue
    let salesQuery = `
      SELECT COALESCE(SUM(s.total_cents), 0) as total,
             COUNT(s.id) as count
      FROM sales s
      WHERE s.sold_at >= ?
    `
    const salesParams: (number | string)[] = [start]
    if (mesero_id) { salesQuery += ' AND s.mesero_id = ?'; salesParams.push(mesero_id) }
    if (menu_item_id) {
      salesQuery += ' AND EXISTS (SELECT 1 FROM sale_items si WHERE si.sale_id = s.id AND si.menu_item_id = ?)'
      salesParams.push(menu_item_id)
    }
    if (hour) {
      salesQuery += ` AND strftime('%H', datetime(s.sold_at, 'unixepoch')) = ?`
      salesParams.push(hour.padStart(2, '0'))
    }
    const salesRow = db.prepare(salesQuery).get(...salesParams as [number | string, ...(number | string)[]]) as { total: number; count: number }

    // Ticket revenue (boletería) — filterable by event_id and hour
    let ticketQuery = `SELECT COALESCE(SUM(price_cents), 0) as total, COUNT(id) as count FROM tickets WHERE created_at >= ?`
    const ticketParams: (number | string)[] = [start]
    if (event_id) { ticketQuery += ' AND event_id = ?'; ticketParams.push(event_id) }
    if (hour) {
      ticketQuery += ` AND strftime('%H', datetime(created_at, 'unixepoch')) = ?`
      ticketParams.push(hour.padStart(2, '0'))
    }
    const ticketsRow = db.prepare(ticketQuery).get(...ticketParams as [number | string, ...(number | string)[]]) as { total: number; count: number }

    // Top selling items
    const topItems = db.prepare(`
      SELECT si.menu_item_id, si.item_name,
             SUM(si.quantity) as units_sold,
             SUM(si.subtotal_cents) as revenue_cents
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.sold_at >= ?
      GROUP BY si.menu_item_id
      ORDER BY units_sold DESC
      LIMIT 10
    `).all(start)

    // Mesero breakdown
    const meseroBreakdown = db.prepare(`
      SELECT u.id, u.email, u.nombre,
             COUNT(s.id) as sale_count,
             COALESCE(SUM(s.total_cents), 0) as total_cents
      FROM users u
      LEFT JOIN sales s ON s.mesero_id = u.id AND s.sold_at >= ?
      WHERE u.role = 'mesero'
      GROUP BY u.id
      ORDER BY total_cents DESC
    `).all(start)

    return reply.send({
      period: label,
      start_ts: start,
      sales: { total_cents: salesRow.total, count: salesRow.count },
      tickets: { total_cents: ticketsRow.total, count: ticketsRow.count },
      grand_total_cents: salesRow.total + ticketsRow.total,
      top_items: topItems,
      mesero_breakdown: meseroBreakdown,
    })
  })

  // GET /dashboard/hours — sales grouped by hour for current day (tonight chart)
  app.get('/hours', { preHandler: [verifyAuth, requireRole('admin')] }, async (_req, reply) => {
    const startOfDay = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000)

    // Sales by hour
    const salesHours = db.prepare(`
      SELECT strftime('%H', datetime(sold_at, 'unixepoch')) as hour,
             COALESCE(SUM(total_cents), 0) as sales_cents,
             COUNT(id) as sale_count
      FROM sales
      WHERE sold_at >= ?
      GROUP BY hour
      ORDER BY hour
    `).all(startOfDay)

    // Tickets by hour (using created_at)
    const ticketHours = db.prepare(`
      SELECT strftime('%H', datetime(created_at, 'unixepoch')) as hour,
             COALESCE(SUM(price_cents), 0) as ticket_cents,
             COUNT(id) as ticket_count
      FROM tickets
      WHERE created_at >= ?
      GROUP BY hour
      ORDER BY hour
    `).all(startOfDay)

    // Merge into 24h array
    const hours = Array.from({ length: 24 }, (_, i) => {
      const h = String(i).padStart(2, '0')
      const s = (salesHours as Array<{ hour: string; sales_cents: number; sale_count: number }>).find(r => r.hour === h)
      const t = (ticketHours as Array<{ hour: string; ticket_cents: number; ticket_count: number }>).find(r => r.hour === h)
      return {
        hour: h,
        sales_cents: s?.sales_cents ?? 0,
        ticket_cents: t?.ticket_cents ?? 0,
        total_cents: (s?.sales_cents ?? 0) + (t?.ticket_cents ?? 0),
      }
    })

    return reply.send({ hours })
  })

  // GET /dashboard/inventory — stock levels with alert flags (admin)
  app.get('/inventory', { preHandler: [verifyAuth, requireRole('admin')] }, async (_req, reply) => {
    const items = db.prepare(`
      SELECT id, name, category, stock_qty, min_stock, is_active,
             CASE WHEN stock_qty >= 0 AND stock_qty <= min_stock THEN 1 ELSE 0 END as is_low_stock
      FROM menu_items
      WHERE is_active = 1
      ORDER BY is_low_stock DESC, category, name
    `).all()
    const alerts = (items as Array<{ is_low_stock: number }>).filter(i => i.is_low_stock === 1).length
    return reply.send({ alert_count: alerts, items })
  })
}
