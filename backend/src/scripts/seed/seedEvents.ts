import type { SqlClient } from '../../lib/db.js'
import { insertEvent } from '../../routes/events/eventRepository.js'
import {
  ACTIVE_EVENT_DETAILS, ACTIVE_EVENT_NIGHTS, LEGACY_DEMO_EVENT_TITLES, PRICE_STAGES, SPOT_OFFERS,
  type RealEventNight,
} from './activeEvent.js'

export interface SeededEvent {
  id: string
  price: number
  night: RealEventNight
}

const findByTitle = (executor: SqlClient, title: string) =>
  executor.one<{ id: string; price: number }>('select id, price from events where title = $1', [title])

const deactivateLegacyDemoEvents = (executor: SqlClient) =>
  executor.run('update events set is_active = false where title = any($1) and is_active', [LEGACY_DEMO_EVENT_TITLES])

/** Las etapas solo se siembran si el evento no tiene ninguna: no pisa lo que edite el admin. */
async function seedPriceStages(executor: SqlClient, eventId: string): Promise<void> {
  const hasStages = await executor.one('select 1 from event_price_stages where event_id = $1 limit 1', [eventId])
  if (hasStages) return
  for (const stage of PRICE_STAGES) {
    await executor.run(
      'insert into event_price_stages (event_id, nombre, price_cents, sort_order) values ($1, $2, $3, $4)',
      [eventId, stage.nombre, stage.price_cents, stage.sort_order],
    )
  }
}

async function seedSpotOffers(executor: SqlClient, eventId: string): Promise<void> {
  for (const offer of SPOT_OFFERS) {
    await executor.run(
      `insert into event_spot_offers (event_id, tipo, price_cents, incluye) values ($1, $2, $3, $4)
       on conflict (event_id, tipo) do nothing`,
      [eventId, offer.tipo, offer.price_cents, offer.incluye],
    )
  }
}

/**
 * Deja solo el evento activo real (una fila por fecha) con sus etapas y ofertas de palco/mesa.
 * Idempotente por título: si el evento ya existe no se tocan sus datos ni sus cupos.
 */
export async function seedEvents(
  executor: SqlClient,
  promoterId: string,
): Promise<{ events: SeededEvent[]; created: number }> {
  await deactivateLegacyDemoEvents(executor)
  const events: SeededEvent[] = []
  let created = 0
  for (const night of ACTIVE_EVENT_NIGHTS) {
    let event = await findByTitle(executor, night.title)
    if (!event) {
      const { listSlug: _listSlug, ...columns } = night
      event = await insertEvent({ ...ACTIVE_EVENT_DETAILS, ...columns, promoter_id: promoterId }, executor)
      created++
    }
    await seedPriceStages(executor, event.id)
    await seedSpotOffers(executor, event.id)
    events.push({ id: event.id, price: event.price, night })
  }
  return { events, created }
}
