import type { FastifyInstance } from 'fastify'
import { listActiveMenu } from '../../services/menu.js'

export async function listMenuRoute(app: FastifyInstance) {
  // Público: carta activa ordenada por categoría.
  app.get('/', async (_req, reply) => reply.send(await listActiveMenu()))
}
