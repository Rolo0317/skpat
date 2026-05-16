import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'

export async function mySalesRoute(app: FastifyInstance) {
  app.get('/mine', { preHandler: [verifyAuth, requireRole('mesero', 'admin')] }, async (req, reply) => {
    const mesero_id = req.user!.id
    // Today: from midnight UTC
    const startOfDay = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000)

    const sales = db.prepare(`
      SELECT s.id, s.table_number, s.payment_method, s.total_cents, s.notes, s.sold_at,
             GROUP_CONCAT(si.item_name || ' x' || si.quantity, ', ') as items_summary
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id
      WHERE s.mesero_id = ? AND s.sold_at >= ?
      GROUP BY s.id
      ORDER BY s.sold_at DESC
    `).all(mesero_id, startOfDay)

    const total_tonight = (sales as { total_cents: number }[]).reduce((sum, s) => sum + s.total_cents, 0)

    return reply.send({ sales, total_tonight_cents: total_tonight })
  })
}
