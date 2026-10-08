import type { FastifyInstance } from 'fastify'
import { listActiveEvents } from './eventRepository.js'
import { currentEventPrice } from '../../services/pricing.js'

export async function listEventsRoute(app: FastifyInstance) {
  app.get('/', async (_req, reply) => {
    const events = await listActiveEvents()
    const withPrices = await Promise.all(
      events.map(async (event) => ({ ...event, precio_vigente: await currentEventPrice(event.id, event.price) })),
    )
    return reply.send(withPrices)
  })
}
