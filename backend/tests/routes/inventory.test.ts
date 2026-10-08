import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/app.js'
import { db } from '../../src/lib/db.js'
import type { FastifyInstance } from 'fastify'
import { createMenuItem, createUser, resetDb } from '../helpers.js'

let app: FastifyInstance
let adminToken: string
let meseroToken: string
let trackedItemId: string
let untrackedItemId: string

const setStock = (id: string, stockQty: number) => db.run('update menu_items set stock_qty = $2 where id = $1', [id, stockQty])
const stockOf = async (id: string) => (await db.one<{ stock_qty: number }>('select stock_qty from menu_items where id = $1', [id]))!.stock_qty
const sell = (menuItemId: string, quantity: number) =>
  app.inject({
    method: 'POST', url: '/sales', headers: { authorization: `Bearer ${meseroToken}` },
    payload: { payment_method: 'efectivo', items: [{ menu_item_id: menuItemId, quantity }] },
  })

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
  await resetDb()
  adminToken = (await createUser('admin')).token
  meseroToken = (await createUser('mesero')).token
  trackedItemId = await createMenuItem({ name: 'Tracked Beer', stock_qty: 10, min_stock: 3 })
  untrackedItemId = await createMenuItem({ name: 'Untracked Rum', category: 'licores', price_cents: 8000000, stock_qty: -1 })
})

afterAll(async () => {
  await resetDb()
  await app.close()
})

describe('GET /inventory', () => {
  it('returns all items with stock fields for admin', async () => {
    const res = await app.inject({ method: 'GET', url: '/inventory', headers: { authorization: `Bearer ${adminToken}` } })
    expect(res.statusCode).toBe(200)
    const tracked = (res.json() as Array<{ id: string; stock_qty: number; is_low_stock: boolean }>).find((i) => i.id === trackedItemId)
    expect(tracked?.stock_qty).toBe(10)
    expect(tracked?.is_low_stock).toBe(false)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/inventory' })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /inventory/alerts', () => {
  it('returns items at or below min_stock, excluding untracked items', async () => {
    await setStock(trackedItemId, 2)
    const res = await app.inject({ method: 'GET', url: '/inventory/alerts', headers: { authorization: `Bearer ${adminToken}` } })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { count: number; items: Array<{ id: string }> }
    expect(body.count).toBe(1)
    expect(body.items[0].id).toBe(trackedItemId)
    await setStock(trackedItemId, 10)
  })
})

describe('POST /sales stock decrement', () => {
  it('decrements stock_qty for tracked items on sale', async () => {
    await setStock(trackedItemId, 10)
    expect((await sell(trackedItemId, 3)).statusCode).toBe(201)
    expect(await stockOf(trackedItemId)).toBe(7)
  })

  it('never takes stock below zero', async () => {
    await setStock(trackedItemId, 2)
    expect((await sell(trackedItemId, 5)).statusCode).toBe(201)
    expect(await stockOf(trackedItemId)).toBe(0)
    await setStock(trackedItemId, 10)
  })

  it('does NOT decrement stock_qty for untracked items (stock_qty=-1)', async () => {
    expect((await sell(untrackedItemId, 5)).statusCode).toBe(201)
    expect(await stockOf(untrackedItemId)).toBe(-1)
  })
})

describe('PUT /inventory/:id/stock', () => {
  it('updates stock_qty and min_stock', async () => {
    const res = await app.inject({
      method: 'PUT', url: `/inventory/${trackedItemId}/stock`, headers: { authorization: `Bearer ${adminToken}` },
      payload: { stock_qty: 50, min_stock: 5 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ stock_qty: 50, min_stock: 5 })
  })

  it('rejects an invalid stock value', async () => {
    const res = await app.inject({
      method: 'PUT', url: `/inventory/${trackedItemId}/stock`, headers: { authorization: `Bearer ${adminToken}` },
      payload: { stock_qty: -5 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 for a non-uuid id', async () => {
    const res = await app.inject({
      method: 'PUT', url: '/inventory/nope/stock', headers: { authorization: `Bearer ${adminToken}` }, payload: { stock_qty: 1 },
    })
    expect(res.statusCode).toBe(404)
  })
})
