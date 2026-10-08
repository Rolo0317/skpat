import { db, type SqlClient } from '../lib/db.js'

export interface PriceStageRow {
  id: string
  event_id: string
  nombre: string
  price_cents: number
  ends_at: Date | null
  sort_order: number
}

export interface CurrentPrice {
  nombre: string
  price_cents: number
  ends_at: Date | null
  es_taquilla: boolean
}

export async function currentEventPrice(
  eventId: string,
  fallbackPriceCents: number,
  executor: SqlClient = db,
): Promise<CurrentPrice> {
  const stage = await executor.one<PriceStageRow>(
    `select id, event_id, nombre, price_cents, ends_at, sort_order
       from event_price_stages
      where event_id = $1 and (ends_at is null or ends_at > now())
      order by sort_order asc, ends_at asc nulls last
      limit 1`,
    [eventId],
  )
  if (stage) {
    return { nombre: stage.nombre, price_cents: stage.price_cents, ends_at: stage.ends_at, es_taquilla: false }
  }
  return { nombre: 'Taquilla', price_cents: fallbackPriceCents, ends_at: null, es_taquilla: true }
}

export async function eventOffer(eventId: string, eventPriceCents: number, executor: SqlClient = db) {
  const etapas = await executor.many<PriceStageRow>(
    `select id, event_id, nombre, price_cents, ends_at, sort_order
       from event_price_stages
      where event_id = $1
      order by sort_order asc`,
    [eventId],
  )
  const ubicaciones = await executor.many<{ tipo: 'palco' | 'mesa'; price_cents: number; incluye: string[] }>(
    'select tipo, price_cents, incluye from event_spot_offers where event_id = $1 order by tipo',
    [eventId],
  )
  const precio_vigente = await currentEventPrice(eventId, eventPriceCents, executor)
  return { etapas, precio_vigente, ubicaciones }
}
