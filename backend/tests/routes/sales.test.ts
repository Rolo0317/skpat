import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/app.js'
import { db } from '../../src/lib/db.js'
import type { FastifyInstance } from 'fastify'
import { createMenuItem, createUser, resetDb } from '../helpers.js'

let app: FastifyInstance
let meseroToken: string
let meseroId: string
let adminToken: string
let testItemId: string

const createSaleRequest = (payload: Record<string, unknown>, token = meseroToken) =>
  app.inject({ method: 'POST', url: '/sales', headers: { authorization: `Bearer ${token}` }, payload })

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
  await resetDb()
  const mesero = await createUser('mesero')
  meseroToken = mesero.token
  meseroId = mesero.id
  adminToken = (await createUser('admin')).token
  testItemId = await createMenuItem({ name: 'Club Colombia', price_cents: 1200000 })
})

afterAll(async () => {
  await resetDb()
  await app.close()
})

describe('POST /sales', () => {
  it('creates sale with items, table and server-side total', async () => {
    const res = await createSaleRequest({ table_number: 3, payment_method: 'nequi', items: [{ menu_item_id: testItemId, quantity: 2 }] })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.sale_id).toBeTruthy()
    expect(body.total_cents).toBe(2400000)
    expect(body.item_count).toBe(1)

    const sale = await db.one<{ table_id: string | null; mesero_id: string }>('select table_id, mesero_id from sales where id = $1', [body.sale_id])
    expect(sale?.table_id).toBeTruthy()
    expect(sale?.mesero_id).toBe(meseroId)
    const items = await db.many<{ item_name: string; subtotal_cents: number }>('select item_name, subtotal_cents from sale_items where sale_id = $1', [body.sale_id])
    expect(items).toEqual([{ item_name: 'Club Colombia', subtotal_cents: 2400000 }])
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/sales', payload: { items: [] } })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 with no items', async () => {
    const res = await createSaleRequest({ items: [] })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 MenuItemNotFound for a non-uuid item and records nothing', async () => {
    const before = await db.one<{ n: number }>('select count(*) as n from sales')
    const res = await createSaleRequest({ items: [{ menu_item_id: testItemId }, { menu_item_id: 'nope' }] })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: 'MenuItemNotFound', item_id: 'nope' })
    const after = await db.one<{ n: number }>('select count(*) as n from sales')
    expect(after?.n).toBe(before?.n)
  })

  it('returns 422 MenuItemInactive for an inactive item', async () => {
    const inactiveId = await createMenuItem({ name: 'Old', is_active: false })
    const res = await createSaleRequest({ items: [{ menu_item_id: inactiveId }] })
    expect(res.statusCode).toBe(422)
    expect(res.json()).toMatchObject({ error: 'MenuItemInactive', item_id: inactiveId })
  })
})

describe('GET /sales/mine', () => {
  it('returns tonight sales of the mesero with summary and total', async () => {
    const res = await app.inject({ method: 'GET', url: '/sales/mine', headers: { authorization: `Bearer ${meseroToken}` } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.sales).toHaveLength(1)
    expect(body.sales[0].items_summary).toBe('Club Colombia x2')
    expect(body.total_tonight_cents).toBe(2400000)
  })
})

describe('GET /sales/tonight', () => {
  it('returns sales grouped by mesero for admin', async () => {
    const res = await app.inject({ method: 'GET', url: '/sales/tonight', headers: { authorization: `Bearer ${adminToken}` } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.by_mesero).toEqual([expect.objectContaining({ mesero_id: meseroId, sale_count: 1, total_cents: 2400000 })])
    expect(body.grand_total_cents).toBe(2400000)
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns 403 for mesero role', async () => {
    const res = await app.inject({ method: 'GET', url: '/sales/tonight', headers: { authorization: `Bearer ${meseroToken}` } })
    expect(res.statusCode).toBe(403)
  })
})
