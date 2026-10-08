import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { LOW_STOCK_SQL } from '../../services/inventory.js'

export async function listInventoryRoute(app: FastifyInstance) {
  app.get('/', { preHandler: [verifyAuth, requireRole('admin')] }, async (_req, reply) => {
    const items = await db.many(
      `select id, name, category, price_cents, stock_qty, min_stock, is_active, ${LOW_STOCK_SQL} as is_low_stock
         from menu_items
        order by category, name`,
    )
    return reply.send(items)
  })
}
