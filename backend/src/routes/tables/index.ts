import type { FastifyInstance } from 'fastify'
import { listTablesRoute } from './list.js'

export async function tablesRoutes(app: FastifyInstance) {
  await listTablesRoute(app)
}
