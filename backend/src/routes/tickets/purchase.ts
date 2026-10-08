import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, HttpError } from '../../lib/db.js'
import { isUuid } from '../../lib/ids.js'
import { optionalAuth } from '../../plugins/auth.js'
import { insertTicket, isUniqueViolation, reserveEventCapacity } from '../../services/tickets.js'
import { currentEventPrice } from '../../services/pricing.js'
import { eventWhatsappUrl } from '../../services/whatsapp.js'

const purchaseSchema = z.object({
  event_id: z.string().min(1),
  nombre: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(255),
  cedula: z.string().regex(/^\d{5,15}$/, 'Cedula must be 5-15 digits'),
  telefono: z.string().regex(/^\d{7,15}$/).optional(),
})

type PurchaseInput = z.infer<typeof purchaseSchema>

async function createTicket(input: PurchaseInput, userId: string | null) {
  if (!isUuid(input.event_id)) throw new HttpError(404, 'EventNotFound')

  return db.transaction(async (tx) => {
    const event = await reserveEventCapacity(tx, input.event_id)
    const price = await currentEventPrice(event.id, event.price, tx)
    const { id, qrToken } = await insertTicket(tx, {
      eventId: event.id, userId, nombre: input.nombre, email: input.email, cedula: input.cedula,
      telefono: input.telefono, ticketType: 'general', priceCents: price.price_cents,
      status: 'pending_payment', priceStage: price.nombre,
    })
    return { event, ticketId: id, priceCents: price.price_cents, priceStage: price.nombre, qrToken }
  }).catch((err: unknown) => {
    if (isUniqueViolation(err)) throw new HttpError(409, 'AlreadyOnList')
    throw err
  })
}

export async function purchaseTicketRoute(app: FastifyInstance) {
  app.post('/purchase', { preHandler: [optionalAuth] }, async (req, reply) => {
    const parsed = purchaseSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues })
    }
    const input = parsed.data
    const { event, ticketId, priceCents, priceStage } = await createTicket(input, req.user?.id ?? null)
    const whatsapp_url = await eventWhatsappUrl({
      eventId: event.id,
      eventTitle: event.title,
      tipo: `Entrada general - ${priceStage}`,
      nombre: input.nombre,
      referencia: ticketId,
    })

    return reply.code(201).send({
      ticket_id: ticketId,
      status: 'pending_payment',
      event_title: event.title,
      price_cents: priceCents,
      price_stage: priceStage,
      whatsapp_url,
    })
  })
}
