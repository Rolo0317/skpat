import type { FastifyInstance } from 'fastify'
import { db, HttpError } from '../../lib/db.js'
import { encrypt } from '../../lib/encrypt.js'
import { isUuid } from '../../lib/ids.js'
import { buyerSchema, parseOrThrow } from '../../lib/schemas.js'
import { eventWhatsappUrl } from '../../services/whatsapp.js'
import { isUniqueViolation } from '../../services/tickets.js'

async function findEvent(eventId: string) {
  const event = isUuid(eventId)
    ? await db.one<{ id: string; title: string; is_active: boolean; promoter_id: string | null }>(
      'select id, title, is_active, promoter_id from events where id = $1',
      [eventId],
    )
    : undefined
  if (!event) throw new HttpError(404, 'EventNotFound')
  if (!event.is_active) throw new HttpError(422, 'EventNotActive')
  return event
}

export async function spotsRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/events/:id/ubicaciones', async (req) => {
    const event = await findEvent(req.params.id)
    return db.many(
      `select s.id, s.tipo, s.numero, s.capacidad, s.posicion_x::float as posicion_x, s.posicion_y::float as posicion_y,
              case
                when r.status = 'confirmed' then 'vendido'
                when r.status = 'pending_payment' then 'reservado'
                else 'disponible'
              end as estado
         from venue_spots s
         left join spot_reservations r on r.spot_id = s.id and r.event_id = $1 and r.status <> 'cancelled'
        where s.activo
        order by s.tipo, s.numero`,
      [event.id],
    )
  })

  app.post<{ Params: { id: string; spotId: string } }>('/events/:id/ubicaciones/:spotId/reservar', async (req, reply) => {
    const event = await findEvent(req.params.id)
    const input = parseOrThrow(buyerSchema, req.body)
    const spot = isUuid(req.params.spotId)
      ? await db.one<{ id: string; tipo: 'palco' | 'mesa'; numero: number }>(
        'select id, tipo, numero from venue_spots where id = $1 and activo',
        [req.params.spotId],
      )
      : undefined
    if (!spot) throw new HttpError(404, 'SpotNotFound')
    const offer = await db.one<{ price_cents: number }>(
      'select price_cents from event_spot_offers where event_id = $1 and tipo = $2',
      [event.id, spot.tipo],
    )
    if (!offer) throw new HttpError(404, 'OfferNotFound')

    try {
      const reservation = await db.one<{ id: string; status: string; price_cents: number }>(
        `insert into spot_reservations (event_id, spot_id, nombre, email, cedula_enc, telefono_enc, price_cents, promoter_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning id, status, price_cents`,
        [event.id, spot.id, input.nombre, input.email, encrypt(input.cedula), input.telefono ? encrypt(input.telefono) : null, offer.price_cents, event.promoter_id],
      )
      const whatsapp_url = await eventWhatsappUrl({
        eventId: event.id,
        promoterId: event.promoter_id,
        eventTitle: event.title,
        tipo: `${spot.tipo} ${spot.numero}`,
        nombre: input.nombre,
        referencia: reservation!.id,
      })
      return reply.code(201).send({
        reservation_id: reservation!.id,
        status: reservation!.status,
        price_cents: reservation!.price_cents,
        whatsapp_url,
      })
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new HttpError(409, 'SpotTaken')
      }
      throw err
    }
  })
}
