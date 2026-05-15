import type { FastifyInstance } from 'fastify'
import { purchaseTicketRoute } from './purchase.js'
import { scanTicketRoute } from './scan.js'
import { listAttendeesRoute } from './attendees.js'
import { myTicketsRoute } from './myTickets.js'

export async function ticketsRoutes(app: FastifyInstance) {
  await purchaseTicketRoute(app)
  await scanTicketRoute(app)
  await listAttendeesRoute(app)
  await myTicketsRoute(app)
}
