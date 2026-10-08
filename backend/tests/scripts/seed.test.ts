import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { db } from '../../src/lib/db.js'
import { verifySecret } from '../../src/lib/argon2.js'
import { runSeed } from '../../src/scripts/seed/runSeed.js'
import { DEMO_MENU, DEMO_STAFF } from '../../src/scripts/seed/catalog.js'
import { ACTIVE_EVENT_NIGHTS, LEGACY_DEMO_EVENT_TITLES, REAL_PROMOTERS } from '../../src/scripts/seed/activeEvent.js'
import { pastWeekendNights } from '../../src/scripts/seed/bogotaCalendar.js'
import { createEvent, resetDb } from '../helpers.js'

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
  it('returns past weekend nights, most recent first', () => {
    expect(pastWeekendNights(2, NOW).map((night) => night.toISOString())).toEqual([
      '2026-10-04T03:00:00.000Z', '2026-10-03T03:00:00.000Z',
    ])
  })
})

describe('runSeed', () => {
  it('replaces demo events with the real active event, one row per night', async () => {
    const legacyId = await createEvent({ title: LEGACY_DEMO_EVENT_TITLES[0] })
    const summary = await runSeed({ credentialsFile, now: NOW })
    expect(summary).toMatchObject({
      users: DEMO_STAFF.length, promoters: Object.keys(REAL_PROMOTERS).length,
      events: ACTIVE_EVENT_NIGHTS.length, lists: ACTIVE_EVENT_NIGHTS.length, menuItems: DEMO_MENU.length,
    })
    expect(summary.sales).toBeGreaterThan(0)

    const legacy = await db.one<{ is_active: boolean }>('select is_active from events where id = $1', [legacyId])
    expect(legacy!.is_active).toBe(false)

    const events = await db.many<{ title: string; date: Date; ends_at: Date; price: number; lineup: string[]; description: string }>(
      'select title, date, ends_at, price, lineup, description from events where is_active order by date',
    )
    expect(events.map((event) => event.title)).toEqual(ACTIVE_EVENT_NIGHTS.map((night) => night.title))
    expect(events.map((event) => event.date.toISOString())).toEqual(['2026-10-11T02:00:00.000Z', '2026-10-12T02:00:00.000Z'])
    expect(events.map((event) => event.ends_at.toISOString())).toEqual(['2026-10-11T17:00:00.000Z', '2026-10-12T17:00:00.000Z'])
    expect(events.every((event) => bogotaHour(event.date) === 21 && event.price === 0)).toBe(true)
    expect(events[0]!.lineup).toEqual(['Simon Correa', 'Santiago Cardona', 'Sabriel', 'Sebastián Robayo'])
    expect(events[0]!.description).toContain('Consumo obligatorio')

    const lowStock = await countRows('menu_items where stock_qty >= 0 and stock_qty < min_stock')
    expect(lowStock).toBeGreaterThan(0)
  }, SEED_TIMEOUT_MS)

  it('seeds stages, palco/mesa offers, promoters, lists and the venue reference', async () => {
    const stages = await db.many<{ nombre: string; price_cents: number }>(
      'select nombre, price_cents from event_price_stages order by event_id, sort_order',
    )
    expect(stages.map((stage) => stage.price_cents)).toEqual([1_000_000, 1_500_000, 1_000_000, 1_500_000])

    const offers = await db.many<{ tipo: string; price_cents: number; incluye: string[] }>(
      'select distinct tipo, price_cents, incluye from event_spot_offers order by tipo',
    )
    expect(offers).toEqual([
      { tipo: 'mesa', price_cents: 100_000_000, incluye: ['8 entradas', '1 botella', '1 Electrolit', '2 aguas', '1 Four Loko', '12 productos'] },
      { tipo: 'palco', price_cents: 120_000_000, incluye: ['10 entradas', '1 botella', '2 Four Loko', '2 aguas', '2 Electrolit', '15 productos'] },
    ])

    const promoters = await db.many<{ whatsapp: string }>('select whatsapp from promoters order by created_at')
    expect(promoters.map((promoter) => promoter.whatsapp)).toEqual(Object.values(REAL_PROMOTERS).map((promoter) => promoter.whatsapp))

    const lists = await db.many<{ slug: string; nombre: string; promoter: string }>(
      'select l.slug, l.nombre, p.whatsapp as promoter from guest_lists l join promoters p on p.id = l.promoter_id order by l.slug',
    )
    expect(lists).toEqual([
      { slug: 'maratoneados-domingo', nombre: 'Lista general', promoter: REAL_PROMOTERS.eventos.whatsapp },
      { slug: 'maratoneados-sabado', nombre: 'Lista general', promoter: REAL_PROMOTERS.eventos.whatsapp },
    ])

    const settings = await db.one<{ referencia: string }>('select referencia from venue_settings')
    expect(settings!.referencia).toBe('Sector Plaza de las Américas, Bogotá')
  })

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
    const counts = () => Promise.all(['event_price_stages', 'event_spot_offers', 'guest_lists', 'promoters', 'tickets'].map(countRows))
    const countsBefore = await counts()

    const summary = await runSeed({ credentialsFile, now: NOW })

    expect(summary).toEqual({ users: 0, promoters: 0, events: 0, lists: 0, menuItems: 0, sales: 0 })
    expect(await db.many('select email, password_hash from users order by email')).toEqual(hashesBefore)
    expect(await readFile(credentialsFile, 'utf8')).toBe(credentialsBefore)
    expect(await counts()).toEqual(countsBefore)
  }, SEED_TIMEOUT_MS)
})
