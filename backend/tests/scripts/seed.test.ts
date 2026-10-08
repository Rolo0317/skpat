import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { db } from '../../src/lib/db.js'
import { verifySecret } from '../../src/lib/argon2.js'
import { runSeed } from '../../src/scripts/seed/runSeed.js'
import { DEMO_EVENTS, DEMO_MENU, DEMO_STAFF } from '../../src/scripts/seed/catalog.js'
import { pastWeekendNights, upcomingWeekendNights } from '../../src/scripts/seed/bogotaCalendar.js'
import { resetDb } from '../helpers.js'

const SEED_TIMEOUT_MS = 60_000
/** Miércoles 7 de octubre de 2026, 15:00 en Bogotá. */
const NOW = new Date('2026-10-07T20:00:00Z')
const BOGOTA_TIME_ZONE = 'America/Bogota'

let tempDir: string
let credentialsFile: string

const bogotaWeekday = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long', timeZone: BOGOTA_TIME_ZONE })
const bogotaHour = (date: Date) => Number(date.toLocaleString('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: BOGOTA_TIME_ZONE }))
const countRows = async (table: string) => (await db.one<{ n: number }>(`select count(*) as n from ${table}`))!.n

function parseCredentials(content: string) {
  return content
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [role, email, password] = line.split('\t')
      return { role, email, password: password! }
    })
}

beforeAll(async () => {
  await resetDb()
  tempDir = await mkdtemp(path.join(tmpdir(), 'skpat-seed-'))
  credentialsFile = path.join(tempDir, '.demo-credentials.txt')
}, SEED_TIMEOUT_MS)

afterAll(async () => {
  await resetDb()
  await rm(tempDir, { recursive: true, force: true })
})

describe('bogotaCalendar', () => {
  it('returns upcoming Friday/Saturday nights at 22:00 Bogotá', () => {
    const nights = upcomingWeekendNights(4, NOW)
    expect(nights.map((night) => night.toISOString())).toEqual([
      '2026-10-10T03:00:00.000Z', '2026-10-11T03:00:00.000Z', '2026-10-17T03:00:00.000Z', '2026-10-18T03:00:00.000Z',
    ])
    expect(nights.map(bogotaWeekday)).toEqual(['Friday', 'Saturday', 'Friday', 'Saturday'])
  })

  it('returns past weekend nights, most recent first', () => {
    expect(pastWeekendNights(2, NOW).map((night) => night.toISOString())).toEqual([
      '2026-10-04T03:00:00.000Z', '2026-10-03T03:00:00.000Z',
    ])
  })
})

describe('runSeed', () => {
  it('seeds demo users, events, menu, sales and tickets', async () => {
    const summary = await runSeed({ credentialsFile, now: NOW })
    expect(summary).toMatchObject({ users: DEMO_STAFF.length, events: DEMO_EVENTS.length, menuItems: DEMO_MENU.length })
    expect(summary.sales).toBeGreaterThan(0)
    expect(summary.tickets).toBeGreaterThan(0)

    const events = await db.many<{ image_url: string | null; lineup: string[]; genre: string; date: Date }>(
      'select image_url, lineup, genre, date from events order by date',
    )
    expect(events.every((event) => event.image_url === null)).toBe(true)
    expect(events.every((event) => event.lineup.length > 0 && event.genre)).toBe(true)
    expect(events.every((event) => event.date > NOW && bogotaHour(event.date) === 22)).toBe(true)

    const lowStock = await countRows('menu_items where stock_qty >= 0 and stock_qty < min_stock')
    expect(lowStock).toBeGreaterThan(0)
  }, SEED_TIMEOUT_MS)

  it('spreads sales across meseros and the 22:00–04:00 shift', async () => {
    const sellers = await db.one<{ n: number }>('select count(distinct mesero_id) as n from sales')
    expect(sellers!.n).toBe(DEMO_STAFF.filter((user) => user.role === 'mesero').length)

    const soldAt = (await db.many<{ sold_at: Date }>('select sold_at from sales')).map((sale) => bogotaHour(sale.sold_at))
    expect(soldAt.every((hour) => hour >= 22 || hour < 4)).toBe(true)

    const mismatched = await countRows(
      'sales s where s.total_cents <> (select sum(subtotal_cents) from sale_items si where si.sale_id = s.id)',
    )
    expect(mismatched).toBe(0)
  })

  it('writes strong argon2-verifiable passwords only to the credentials file', async () => {
    const credentials = parseCredentials(await readFile(credentialsFile, 'utf8'))
    expect(credentials.map((credential) => credential.email).sort()).toEqual(DEMO_STAFF.map((user) => user.email).sort())

    for (const { email, password } of credentials) {
      expect(password.length).toBeGreaterThanOrEqual(24)
      const user = await db.one<{ password_hash: string }>('select password_hash from users where email = $1', [email])
      await expect(verifySecret(user!.password_hash, password)).resolves.toBe(true)
    }
  })

  it('is idempotent: a second run creates nothing and keeps existing passwords', async () => {
    const hashesBefore = await db.many('select email, password_hash from users order by email')
    const credentialsBefore = await readFile(credentialsFile, 'utf8')
    const ticketsBefore = await countRows('tickets')

    const summary = await runSeed({ credentialsFile, now: NOW })

    expect(summary).toEqual({ users: 0, events: 0, menuItems: 0, sales: 0, tickets: 0 })
    expect(await db.many('select email, password_hash from users order by email')).toEqual(hashesBefore)
    expect(await readFile(credentialsFile, 'utf8')).toBe(credentialsBefore)
    expect(await countRows('tickets')).toBe(ticketsBefore)
  }, SEED_TIMEOUT_MS)
})
