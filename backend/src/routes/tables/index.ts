import type { FastifyInstance } from 'fastify'
import { listTablesRoute } from './list.js'
import { createTableOrderRoute } from './createOrder.js'

export async function tablesRoutes(app: FastifyInstance) {
  await listTablesRoute(app)
  await createTableOrderRoute(app)
}
