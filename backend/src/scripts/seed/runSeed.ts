import { db, type SqlClient } from '../../lib/db.js'
import { createRandom } from './random.js'
import { seedUsers } from './seedUsers.js'
import { seedEvents } from './seedEvents.js'
import { seedMenu } from './seedMenu.js'
import { seedSales } from './seedSales.js'
import { seedGuestLists, seedPromoters, seedVenueSettings } from './seedOperation.js'

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
  promoters: number
  events: number
  lists: number
  menuItems: number
  sales: number
}

/**
 * Operación real (gestores, evento activo con etapas/ofertas, listas y datos del lugar) más
 * personal, carta y ventas históricas de demostración. Sin tiquetes falsos: el cupo del evento real queda intacto.
 */
export async function runSeed({ credentialsFile, executor = db, now = new Date() }: SeedOptions): Promise<SeedSummary> {
  const random = createRandom(DEMO_RANDOM_SEED)
  const { users, created: usersCreated } = await seedUsers(executor, credentialsFile)
  const { ids: promoterIds, created: promotersCreated } = await seedPromoters(executor)
  await seedVenueSettings(executor)
  const { events, created: eventsCreated } = await seedEvents(executor, promoterIds.eventos)
  const lists = await seedGuestLists(executor, events, promoterIds.eventos)
  const { items, created: menuCreated } = await seedMenu(executor)
  const meseroIds = users.filter((user) => user.role === 'mesero').map((user) => user.id)
  const sales = await seedSales(executor, { meseroIds, menu: items, random, now })
  return { users: usersCreated, promoters: promotersCreated, events: eventsCreated, lists, menuItems: menuCreated, sales }
}
