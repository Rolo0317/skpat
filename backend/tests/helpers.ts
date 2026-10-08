import { db } from '../src/lib/db.js'
import { signAccessToken, type SkpatRole } from '../src/lib/jwt.js'

const RESETTABLE_TABLES = [
  'table_orders', 'sale_items', 'sales', 'menu_items', 'palco_reservations',
  'tickets', 'events', 'reset_tokens', 'refresh_tokens', 'users',
]

/** Deja la base limpia (las mesas por defecto se conservan porque son datos de referencia). */
export async function resetDb(): Promise<void> {
  await db.run(`truncate ${RESETTABLE_TABLES.join(', ')} restart identity cascade`)
}

/** Crea un usuario real (las FK lo exigen) y devuelve su id y un access token válido. */
export async function createUser(role: SkpatRole, email = `${role}-${crypto.randomUUID()}@test.co`) {
  const user = await db.one<{ id: string }>(
    `insert into users (email, password_hash, role, nombre) values ($1, 'not-a-real-hash', $2, $3) returning id`,
    [email, role, `Test ${role}`],
  )
  const token = await signAccessToken({ sub: user!.id, email, role })
  return { id: user!.id, email, token }
}

export async function createEvent(overrides: Partial<{ title: string; date: string; price: number; available_spots: number; is_active: boolean }> = {}) {
  const event = { title: 'Test Night', date: '2026-12-01T22:00:00Z', price: 3000000, available_spots: 100, is_active: true, ...overrides }
  const row = await db.one<{ id: string }>(
    `insert into events (title, date, price, available_spots, is_active) values ($1, $2, $3, $4, $5) returning id`,
    [event.title, event.date, event.price, event.available_spots, event.is_active],
  )
  return row!.id
}
