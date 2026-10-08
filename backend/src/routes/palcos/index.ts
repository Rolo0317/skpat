import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, HttpError } from '../../lib/db.js'
import { isUuid } from '../../lib/ids.js'
import { encrypt } from '../../lib/encrypt.js'
import { PALCO_TIERS, palcoLabel, palcoPriceCents, type PalcoTier } from '../../lib/ticketPrices.js'
import { parseOrThrow } from '../../services/validation.js'

const reserveSchema = z.object({
  event_id: z.string().min(1),
  palco_tier: z.enum(PALCO_TIERS),
  nombre: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(255),
  telefono: z.string().regex(/^\d{7,15}$/).optional(),
})

type ReserveInput = z.infer<typeof reserveSchema>

interface ReservationRow {
  id: string
  event_id: string
  palco_tier: PalcoTier
  nombre: string
  email: string
  price_cents: number
  status: string
}

async function findReservableEvent(eventId: string): Promise<{ id: string; title: string }> {
  const event = isUuid(eventId)
    ? await db.one<{ id: string; title: string; is_active: boolean }>('select id, title, is_active from events where id = $1', [eventId])
    : undefined
  if (!event) throw new HttpError(404, 'EventNotFound')
  if (!event.is_active) throw new HttpError(422, 'EventNotActive')
  return event
}

async function insertReservation(input: ReserveInput): Promise<ReservationRow> {
  const row = await db.one<ReservationRow>(
    `insert into palco_reservations (event_id, palco_tier, nombre, email, telefono_enc, price_cents)
     values ($1, $2, $3, $4, $5, $6)
     returning id, event_id, palco_tier, nombre, email, price_cents, status`,
    [
      input.event_id, input.palco_tier, input.nombre, input.email,
      input.telefono ? encrypt(input.telefono) : null, palcoPriceCents(input.palco_tier),
    ],
  )
  return row!
}

const confirmationMessage = (tier: PalcoTier) =>
  `Reserva de ${palcoLabel(tier)} confirmada. El equipo de Skpat VIP se pondra en contacto contigo pronto.`

export async function palcosRoutes(app: FastifyInstance) {
  app.post('/reserve', async (req, reply) => {
    const input = parseOrThrow(reserveSchema, req.body)
    const event = await findReservableEvent(input.event_id)
    const reservation = await insertReservation(input)

    return reply.code(201).send({
      reservation_id: reservation.id,
      event_id: reservation.event_id,
      event_title: event.title,
      palco_tier: reservation.palco_tier,
      nombre: reservation.nombre,
      email: reservation.email,
      price_cents: reservation.price_cents,
      status: reservation.status,
      message: confirmationMessage(reservation.palco_tier),
    })
  })
}
