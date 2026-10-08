import type { FastifyInstance } from 'fastify'
import { listEventsRoute } from './list.js'
import { createEventRoute } from './create.js'
import { updateEventRoute } from './update.js'
import { deleteEventRoute } from './delete.js'
import { eventOfferRoutes } from './offer.js'

export async function eventsRoutes(app: FastifyInstance) {
  await listEventsRoute(app)
  await eventOfferRoutes(app)
  await createEventRoute(app)
  await updateEventRoute(app)
  await deleteEventRoute(app)
}
