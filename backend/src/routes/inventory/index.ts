import type { FastifyInstance } from 'fastify'
import { listInventoryRoute } from './list.js'
import { stockAlertsRoute } from './alerts.js'
import { updateStockRoute } from './updateStock.js'

export async function inventoryRoutes(app: FastifyInstance) {
  await listInventoryRoute(app)
  await stockAlertsRoute(app)
  await updateStockRoute(app)
}
