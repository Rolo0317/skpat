import type { SqlClient } from '../../lib/db.js'
import { encrypt } from '../../lib/encrypt.js'
import { generateQrToken } from '../../lib/qr.js'
import { bulkInsert } from './bulkInsert.js'
import { MS_PER_MINUTE } from './bogotaCalendar.js'
import type { Random } from './random.js'
import type { SeededEvent } from './seedEvents.js'

/** Dominio reservado para compradores demo: sirve de marca de idempotencia y para limpiarlos. */
export const DEMO_BUYER_DOMAIN = 'demo.skpat.vip'
const DEMO_BUYER_PATTERN = `%@${DEMO_BUYER_DOMAIN}`
const TICKETS_PER_EVENT = { min: 15, max: 40 }
const PRESALE_WINDOW_MINUTES = 21 * 24 * 60
const CEDULA_RANGE = { min: 10_000_000, max: 1_999_999_999 }
const FIRST_NAMES = ['Juan', 'María', 'Santiago', 'Valeria', 'Sebastián', 'Daniela', 'Mateo', 'Camila', 'Nicolás', 'Sara'] as const
const LAST_NAMES = ['Gómez', 'Rodríguez', 'Martínez', 'López', 'García', 'Hernández', 'Ramírez', 'Torres', 'Moreno', 'Rojas'] as const

const TICKET_COLUMNS = ['event_id', 'nombre', 'cedula_enc', 'email', 'qr_token', 'ticket_type', 'price_cents', 'created_at'] as const

export interface TicketsContext {
  events: SeededEvent[]
  random: Random
  now: Date
}

function buildTicket(event: SeededEvent, sequence: number, { random, now }: TicketsContext) {
  return {
    event_id: event.id,
    nombre: `${random.pick(FIRST_NAMES)} ${random.pick(LAST_NAMES)}`,
    cedula_enc: encrypt(String(random.int(CEDULA_RANGE.min, CEDULA_RANGE.max))),
    email: `comprador${sequence}@${DEMO_BUYER_DOMAIN}`,
    qr_token: generateQrToken(),
    ticket_type: 'general',
    price_cents: event.price,
    created_at: new Date(now.getTime() - random.int(0, PRESALE_WINDOW_MINUTES) * MS_PER_MINUTE),
  }
}

const alreadySeeded = async (executor: SqlClient) =>
  Boolean(await executor.one('select 1 from tickets where email like $1 limit 1', [DEMO_BUYER_PATTERN]))

const discountSoldSpots = (executor: SqlClient) =>
  executor.run(
    `update events e set available_spots = greatest(e.available_spots - sold.n, 0)
       from (select event_id, count(*) as n from tickets where email like $1 group by event_id) sold
      where e.id = sold.event_id`,
    [DEMO_BUYER_PATTERN],
  )

/** Preventa de las últimas semanas para los eventos demo; descuenta los cupos vendidos. */
export async function seedTickets(executor: SqlClient, context: TicketsContext): Promise<number> {
  if (await alreadySeeded(executor)) return 0
  let sequence = 0
  const ticketsPerEvent = () => context.random.int(TICKETS_PER_EVENT.min, TICKETS_PER_EVENT.max)
  const tickets = context.events.flatMap((event) =>
    Array.from({ length: ticketsPerEvent() }, () => buildTicket(event, ++sequence, context)),
  )
  await executor.transaction(async (tx) => {
    await bulkInsert(tx, 'tickets', TICKET_COLUMNS, tickets)
    await discountSoldSpots(tx)
  })
  return tickets.length
}
