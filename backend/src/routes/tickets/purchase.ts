import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, HttpError, type SqlClient } from '../../lib/db.js'
import { isUuid } from '../../lib/ids.js'
import { encrypt } from '../../lib/encrypt.js'
import { generateQrToken, generateQrDataUrl } from '../../lib/qr.js'
import { sendTicketEmail } from '../../lib/email.js'
import { optionalAuth } from '../../plugins/auth.js'
import { TICKET_TYPES, ticketPriceCents, type TicketType } from '../../lib/ticketPrices.js'

const purchaseSchema = z.object({
  event_id: z.string().min(1),
  nombre: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(255),
  cedula: z.string().regex(/^\d{5,15}$/, 'Cedula must be 5-15 digits'),
  telefono: z.string().regex(/^\d{7,15}$/).optional(),
  ticket_type: z.enum(TICKET_TYPES as [TicketType, ...TicketType[]]).default('general'),
})

type PurchaseInput = z.infer<typeof purchaseSchema>

interface EventRow { id: string; title: string; date: Date; price: number }

const EMAIL_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'America/Bogota',
}

const UNIQUE_VIOLATION = '23505'

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === UNIQUE_VIOLATION
}

/**
 * Reserva un cupo de forma atómica: el UPDATE condicionado evita sobreventa aunque
 * lleguen compras simultáneas (no hay lectura-luego-escritura).
 */
async function reserveSpot(tx: SqlClient, eventId: string): Promise<EventRow> {
  const reserved = await tx.one<EventRow>(
    `update events set available_spots = available_spots - 1
      where id = $1 and is_active and available_spots > 0
      returning id, title, date, price`,
    [eventId],
  )
  if (reserved) return reserved

  const existing = await tx.one<{ is_active: boolean }>('select is_active from events where id = $1', [eventId])
  if (!existing) throw new HttpError(404, 'EventNotFound')
  throw new HttpError(422, existing.is_active ? 'SoldOut' : 'EventNotActive')
}

async function createTicket(input: PurchaseInput, userId: string | null) {
  if (!isUuid(input.event_id)) throw new HttpError(404, 'EventNotFound')
  const qrToken = generateQrToken()

  // El índice único tickets_lista_unica garantiza un solo QR de lista por correo y evento.
  return db.transaction(async (tx) => {
    const event = await reserveSpot(tx, input.event_id)
    const priceCents = ticketPriceCents(input.ticket_type, event.price)
    const ticket = await tx.one<{ id: string }>(
      `insert into tickets (event_id, user_id, nombre, cedula_enc, email, telefono_enc, qr_token, ticket_type, price_cents)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning id`,
      [
        event.id, userId, input.nombre, encrypt(input.cedula), input.email,
        input.telefono ? encrypt(input.telefono) : null, qrToken, input.ticket_type, priceCents,
      ],
    )
    return { event, ticketId: ticket!.id, priceCents, qrToken }
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
