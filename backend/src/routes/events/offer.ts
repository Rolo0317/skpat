import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, HttpError } from '../../lib/db.js'
import { isUuid } from '../../lib/ids.js'
import { parseOrThrow } from '../../lib/schemas.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { eventOffer } from '../../services/pricing.js'

const stageSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  price_cents: z.coerce.number().int().nonnegative(),
  ends_at: z.string().datetime().nullable().optional(),
  sort_order: z.coerce.number().int().default(0),
})

const offerSchema = z.object({
  tipo: z.enum(['palco', 'mesa']),
  price_cents: z.coerce.number().int().nonnegative(),
  incluye: z.array(z.string().trim().min(1).max(120)).default([]),
})

async function findEvent(eventId: string) {
  const event = isUuid(eventId)
    ? await db.one<{ id: string; price: number }>('select id, price from events where id = $1', [eventId])
    : undefined
  if (!event) throw new HttpError(404, 'EventNotFound')
  return event
}

export async function eventOfferRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/:id/oferta', async (req) => {
    const event = await findEvent(req.params.id)
    return eventOffer(event.id, event.price)
  })

  app.put<{ Params: { id: string } }>(
    '/:id/etapas',
    { preHandler: [verifyAuth, requireRole('admin')] },
    async (req) => {
      const event = await findEvent(req.params.id)
      const stages = parseOrThrow(z.array(stageSchema), req.body)
      return db.transaction(async (tx) => {
        await tx.run('delete from event_price_stages where event_id = $1', [event.id])
        for (const stage of stages) {
          await tx.run(
            `insert into event_price_stages (event_id, nombre, price_cents, ends_at, sort_order)
             values ($1, $2, $3, $4, $5)`,
            [event.id, stage.nombre, stage.price_cents, stage.ends_at ?? null, stage.sort_order],
          )
        }
        return eventOffer(event.id, event.price, tx)
      })
    },
  )

  app.put<{ Params: { id: string } }>(
    '/:id/ofertas',
    { preHandler: [verifyAuth, requireRole('admin')] },
    async (req) => {
      const event = await findEvent(req.params.id)
      const offers = parseOrThrow(z.array(offerSchema), req.body)
      return db.transaction(async (tx) => {
        await tx.run('delete from event_spot_offers where event_id = $1', [event.id])
        for (const offer of offers) {
          await tx.run(
            `insert into event_spot_offers (event_id, tipo, price_cents, incluye)
             values ($1, $2, $3, $4)`,
            [event.id, offer.tipo, offer.price_cents, offer.incluye],
          )
        }
        return eventOffer(event.id, event.price, tx)
      })
    },
  )
}
