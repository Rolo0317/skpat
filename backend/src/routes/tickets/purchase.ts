import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, HttpError } from '../../lib/db.js'
import { isUuid } from '../../lib/ids.js'
import { generateQrDataUrl } from '../../lib/qr.js'
import { sendTicketEmail } from '../../lib/email.js'
import { optionalAuth } from '../../plugins/auth.js'
import { TICKET_TYPES, ticketPriceCents, type TicketType } from '../../lib/ticketPrices.js'
import { insertTicket, isUniqueViolation, reserveEventCapacity } from '../../services/tickets.js'

const purchaseSchema = z.object({
  event_id: z.string().min(1),
  nombre: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(255),
  cedula: z.string().regex(/^\d{5,15}$/, 'Cedula must be 5-15 digits'),
  telefono: z.string().regex(/^\d{7,15}$/).optional(),
  ticket_type: z.enum(TICKET_TYPES as [TicketType, ...TicketType[]]).default('general'),
})

type PurchaseInput = z.infer<typeof purchaseSchema>

const EMAIL_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'America/Bogota',
}

async function createTicket(input: PurchaseInput, userId: string | null) {
  if (!isUuid(input.event_id)) throw new HttpError(404, 'EventNotFound')

  // El índice único tickets_lista_unica garantiza un solo QR de lista por correo y evento.
  return db.transaction(async (tx) => {
    const event = await reserveEventCapacity(tx, input.event_id)
    const priceCents = ticketPriceCents(input.ticket_type, event.price)
    const { id, qrToken } = await insertTicket(tx, {
      eventId: event.id, userId, nombre: input.nombre, email: input.email, cedula: input.cedula,
      telefono: input.telefono, ticketType: input.ticket_type, priceCents, status: 'confirmed',
    })
    return { event, ticketId: id, priceCents, qrToken }
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
    const { event, ticketId, priceCents, qrToken } = await createTicket(input, req.user?.id ?? null)
    const qrDataUrl = await generateQrDataUrl(qrToken)

    // El correo no debe tumbar una compra ya confirmada. Se espera porque en serverless
    // el proceso puede congelarse apenas sale la respuesta.
    await sendTicketEmail({
      to: input.email,
      nombre: input.nombre,
      eventTitle: event.title,
      eventDate: new Date(event.date).toLocaleString('es-CO', EMAIL_DATE_FORMAT),
      ticketType: input.ticket_type,
      qrDataUrl,
      qrToken,
    }).catch((emailErr) => app.log.warn({ emailErr }, 'Failed to send ticket email'))

    return reply.code(201).send({
      ticket_id: ticketId,
      qr_token: qrToken,
      qr_data_url: qrDataUrl,
      event_title: event.title,
      ticket_type: input.ticket_type,
      price_cents: priceCents,
    })
  })
}
