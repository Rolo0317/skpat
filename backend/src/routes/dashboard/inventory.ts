import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { LOW_STOCK_SQL } from '../../services/inventory.js'

interface StockStatusRow {
  id: string
  name: string
  category: string
  stock_qty: number
  min_stock: number
  is_active: boolean
  is_low_stock: boolean
}

export async function inventoryStatusRoute(app: FastifyInstance) {
  app.get('/inventory', { preHandler: [verifyAuth, requireRole('admin')] }, async (_req, reply) => {
    const items = await db.many<StockStatusRow>(
      `select id, name, category, stock_qty, min_stock, is_active, ${LOW_STOCK_SQL} as is_low_stock
         from menu_items
        where is_active
        order by is_low_stock desc, category, name`,
    )
    return reply.send({ alert_count: items.filter((item) => item.is_low_stock).length, items })
  })
}
