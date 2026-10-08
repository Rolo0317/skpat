import { db, type SqlClient } from '../../lib/db.js'
import { createRandom } from './random.js'
import { seedUsers } from './seedUsers.js'
import { seedEvents } from './seedEvents.js'
import { seedMenu } from './seedMenu.js'
import { seedSales } from './seedSales.js'
import { seedTickets } from './seedTickets.js'

/** Semilla fija: los datos demo son reproducibles entre corridas y entornos. */
const DEMO_RANDOM_SEED = 2026

export interface SeedOptions {
  credentialsFile: string
  executor?: SqlClient
  now?: Date
}

/** Resumen sin secretos: cuántas filas creó cada paso (0 = ya existían). */
export interface SeedSummary {
  users: number
  events: number
  menuItems: number
  sales: number
  tickets: number
}

export async function runSeed({ credentialsFile, executor = db, now = new Date() }: SeedOptions): Promise<SeedSummary> {
  const random = createRandom(DEMO_RANDOM_SEED)
  const { users, created: usersCreated } = await seedUsers(executor, credentialsFile)
  const { events, created: eventsCreated } = await seedEvents(executor, now)
  const { items, created: menuCreated } = await seedMenu(executor)
  const meseroIds = users.filter((user) => user.role === 'mesero').map((user) => user.id)
  const sales = await seedSales(executor, { meseroIds, menu: items, random, now })
  const tickets = await seedTickets(executor, { events, random, now })
  return { users: usersCreated, events: eventsCreated, menuItems: menuCreated, sales, tickets }
}
