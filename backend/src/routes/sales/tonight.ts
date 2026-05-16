import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'

export async function tonightSalesRoute(app: FastifyInstance) {
  app.get('/tonight', { preHandler: [verifyAuth, requireRole('admin')] }, async (_req, reply) => {
    const startOfDay = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000)

    const byMesero = db.prepare(`
      SELECT u.id as mesero_id, u.email as mesero_email,
             COUNT(s.id) as sale_count,
             SUM(s.total_cents) as total_cents,
             MAX(s.sold_at) as last_sale_at
      FROM users u
      LEFT JOIN sales s ON s.mesero_id = u.id AND s.sold_at >= ?
      WHERE u.role = 'mesero'
      GROUP BY u.id
      ORDER BY total_cents DESC
    `).all(startOfDay)

    const grand_total = (byMesero as { total_cents: number }[]).reduce((sum, m) => sum + (m.total_cents ?? 0), 0)

    return reply.send({ by_mesero: byMesero, grand_total_cents: grand_total, date: new Date().toISOString().slice(0, 10) })
  })
}
