import type { FastifyInstance } from 'fastify'
import { listActiveEvents } from './eventRepository.js'

export async function listEventsRoute(app: FastifyInstance) {
  app.get('/', async (_req, reply) => reply.send(await listActiveEvents()))
}
