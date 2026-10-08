import type { SqlClient } from '../../lib/db.js'
import { insertEvent } from '../../routes/events/eventRepository.js'
import { upcomingWeekendNights } from './bogotaCalendar.js'
import { DEMO_EVENTS, type DemoEvent } from './catalog.js'

export interface SeededEvent {
  id: string
  price: number
}

const findByTitle = (executor: SqlClient, title: string) =>
  executor.one<SeededEvent>('select id, price from events where title = $1', [title])

// Sin flyer real, la landing pinta un arte generativo único por evento.
function createDemoEvent(executor: SqlClient, { slug: _slug, ...event }: DemoEvent, night: Date) {
  return insertEvent({ ...event, date: night.toISOString(), image_url: null }, executor)
}

/** Idempotente por título: si el evento ya existe no se toca (ni su fecha ni sus cupos). */
export async function seedEvents(executor: SqlClient, now: Date): Promise<{ events: SeededEvent[]; created: number }> {
  const nights = upcomingWeekendNights(DEMO_EVENTS.length, now)
  const events: SeededEvent[] = []
  let created = 0
  for (const [index, demoEvent] of DEMO_EVENTS.entries()) {
    const existing = await findByTitle(executor, demoEvent.title)
    if (existing) {
      events.push(existing)
      continue
    }
    events.push(await createDemoEvent(executor, demoEvent, nights[index]!))
    created++
  }
  return { events, created }
}
