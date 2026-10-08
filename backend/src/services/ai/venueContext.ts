import { db } from '../../lib/db.js'
import { BUSINESS_TIME_ZONE } from '../businessHours.js'
import { listActiveMenu, type ActiveMenuItem } from '../menu.js'
import { memoizeFor } from '../memoize.js'
import { formatCop } from '../money.js'

const UPCOMING_EVENTS_LIMIT = 5
const VENUE_CONTEXT_TTL_MS = 60_000

interface UpcomingEvent {
  title: string
  date: Date
  lineup: string[]
  price: number
  available_spots: number
}

const eventDateFormatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: BUSINESS_TIME_ZONE,
})

function findUpcomingEvents(): Promise<UpcomingEvent[]> {
  return db.many<UpcomingEvent>(
    `select title, date, lineup, price, available_spots
       from events
      where is_active and date >= now()
      order by date
      limit $1`,
    [UPCOMING_EVENTS_LIMIT],
  )
}

function describeEvent(event: UpcomingEvent): string {
  const lineup = event.lineup.length ? ` · Lineup: ${event.lineup.join(', ')}` : ''
  const spots = event.available_spots > 0 ? `${event.available_spots} cupos disponibles` : 'AGOTADO'
  return `- ${event.title} — ${eventDateFormatter.format(event.date)}${lineup} · Entrada general ${formatCop(event.price)} · ${spots}`
}

function groupByCategory(items: ActiveMenuItem[]): Map<string, ActiveMenuItem[]> {
  const groups = new Map<string, ActiveMenuItem[]>()
  for (const item of items) groups.set(item.category, [...(groups.get(item.category) ?? []), item])
  return groups
}

function describeMenu(items: ActiveMenuItem[]): string[] {
  return [...groupByCategory(items)].map(
    ([category, products]) => `- ${category}: ${products.map((p) => `${p.name} ${formatCop(p.price_cents)}`).join('; ')}`,
  )
}

/** Foto actual de eventos y carta para que la IA responda con datos reales (SRP: solo arma el texto). */
export async function buildVenueContext(): Promise<string> {
  const [events, menu] = await Promise.all([findUpcomingEvents(), listActiveMenu()])
  const eventLines = events.length ? events.map(describeEvent) : ['- No hay eventos publicados por ahora.']
  const menuLines = menu.length ? describeMenu(menu) : ['- La carta no está disponible por ahora.']
  return ['PRÓXIMOS EVENTOS:', ...eventLines, '', 'CARTA (precios por unidad):', ...menuLines].join('\n')
}

/** Versión cacheada: el chat es público y no debe golpear la base en cada mensaje. */
export const loadVenueContext = memoizeFor(VENUE_CONTEXT_TTL_MS, buildVenueContext)
