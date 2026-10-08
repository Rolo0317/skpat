import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../../src/app.js'
import { db } from '../../src/lib/db.js'
import { createEvent, createMenuItem, createUser, resetDb } from '../helpers.js'

let app: FastifyInstance
let adminToken: string
let meseroToken: string
let meseroId: string
let beerId: string

const asAdmin = () => ({ authorization: `Bearer ${adminToken}` })
const get = (url: string, headers = asAdmin()) => app.inject({ method: 'GET', url, headers })

async function insertTicket(eventId: string, qrToken: string, scanned: boolean) {
  await db.run(
    `insert into tickets (event_id, nombre, cedula_enc, email, qr_token, price_cents, qr_used, qr_used_at)
     values ($1, 'Asistente', 'enc', 'a@test.co', $2, 3000000, $3, case when $3 then now() end)`,
    [eventId, qrToken, scanned],
  )
}

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
  await resetDb()
  adminToken = (await createUser('admin')).token
  const mesero = await createUser('mesero')
  meseroToken = mesero.token
  meseroId = mesero.id
  beerId = await createMenuItem({ name: 'Club Colombia', price_cents: 1200000, stock_qty: 4, min_stock: 3 })

  await app.inject({
    method: 'POST', url: '/sales', headers: { authorization: `Bearer ${meseroToken}` },
    payload: { items: [{ menu_item_id: beerId, quantity: 2 }] },
  })
  await app.inject({ method: 'POST', url: '/tables/2/orders', payload: { items: [{ menu_item_id: beerId }] } })

  const eventId = await createEvent()
  await insertTicket(eventId, 'qr-scanned-1', true)
  await insertTicket(eventId, 'qr-pending-1', false)
})

afterAll(async () => {
  await resetDb()
  await app.close()
})

describe('GET /dashboard/live', () => {
  it('returns the pulse of tonight in one response', async () => {
    const res = await get('/dashboard/live')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.sales_tonight).toEqual({ total_cents: 2400000, count: 1 })
    expect(body.tickets_today).toEqual({ total_cents: 6000000, count: 2 })
    expect(body.attendees_inside).toBe(1)
    expect(body.top_items).toEqual([{ menu_item_id: beerId, item_name: 'Club Colombia', units_sold: 2, revenue_cents: 2400000 }])
    expect(body.table_orders).toEqual({ pending: 1, attending: 0 })
    expect(body.stock_alerts.count).toBe(1)
    expect(body.stock_alerts.items[0]).toMatchObject({ id: beerId, stock_qty: 2 })
  })

  it('is admin only', async () => {
    expect((await get('/dashboard/live', { authorization: `Bearer ${meseroToken}` })).statusCode).toBe(403)
  })
})

describe('GET /dashboard/summary', () => {
  it('summarizes tonight with mesero breakdown', async () => {
    const res = await get('/dashboard/summary?period=tonight')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.sales).toEqual({ total_cents: 2400000, count: 1 })
    expect(body.grand_total_cents).toBe(2400000 + 6000000)
    expect(body.mesero_breakdown).toEqual([expect.objectContaining({ id: meseroId, sale_count: 1, total_cents: 2400000 })])
    expect(typeof body.start_ts).toBe('number')
  })

  it('applies filters and treats an unknown period as all-time', async () => {
    const res = await get(`/dashboard/summary?period=forever&mesero_id=${crypto.randomUUID()}`)
    expect(res.statusCode).toBe(200)
    expect(res.json().period).toBe('all')
    expect(res.json().sales.count).toBe(0)
  })

  it('rejects malformed id filters', async () => {
    expect((await get('/dashboard/summary?mesero_id=nope')).statusCode).toBe(400)
  })
})

describe('GET /dashboard/hours and /dashboard/inventory', () => {
  it('returns 24 hourly buckets that add up to tonight sales', async () => {
    const { hours } = (await get('/dashboard/hours')).json() as { hours: Array<{ hour: string; sales_cents: number }> }
    expect(hours).toHaveLength(24)
    expect(hours[0].hour).toBe('00')
    expect(hours.reduce((sum, h) => sum + h.sales_cents, 0)).toBe(2400000)
  })

  it('flags low stock items', async () => {
    const body = (await get('/dashboard/inventory')).json()
    expect(body.alert_count).toBe(1)
    expect(body.items[0]).toMatchObject({ id: beerId, is_low_stock: true })
  })
})
