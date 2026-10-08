import type { FastifyInstance } from 'fastify'
import { listOrdersRoute } from './list.js'
import { updateOrderRoute } from './update.js'

export async function ordersRoutes(app: FastifyInstance) {
  await listOrdersRoute(app)
  await updateOrderRoute(app)
}
