import type { FastifyInstance } from 'fastify'
import { chatRoute } from './chat.js'

export async function aiRoutes(app: FastifyInstance) {
  await chatRoute(app)
}
