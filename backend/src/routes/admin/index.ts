import type { FastifyInstance } from 'fastify'
import { assignRoleRoute } from './assignRole.js'

export async function adminRoutes(app: FastifyInstance) {
  await assignRoleRoute(app)
}
