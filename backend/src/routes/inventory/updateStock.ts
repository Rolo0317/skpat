import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { isUuid } from '../../lib/ids.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { stockLevelsSchema } from '../../services/inventory.js'
import { parseOrThrow } from '../../services/validation.js'

const setStockLevels = (id: string, stockQty: number | null, minStock: number | null) =>
  db.one(
    `update menu_items
        set stock_qty = coalesce($2, stock_qty), min_stock = coalesce($3, min_stock), updated_at = now()
      where id = $1
      returning id, name, stock_qty, min_stock`,
    [id, stockQty, minStock],
  )

export async function updateStockRoute(app: FastifyInstance) {
  app.put('/:id/stock', { preHandler: [verifyAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { stock_qty, min_stock } = parseOrThrow(stockLevelsSchema, req.body)
    const updated = isUuid(id) ? await setStockLevels(id, stock_qty ?? null, min_stock ?? null) : undefined
    if (!updated) return reply.code(404).send({ error: 'MenuItemNotFound' })
    return reply.send(updated)
  })
}
