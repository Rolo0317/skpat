import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/app.js'
import { db } from '../../src/lib/db.js'
import { signAccessToken } from '../../src/lib/jwt.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let adminToken: string
let meseroToken: string
let trackedItemId: string
let untrackedItemId: string

beforeAll(async () => {
  app = await buildServer()
  await app.ready()

  const admin = db.prepare(
    `INSERT INTO users (email,password_hash,role,nombre) VALUES ('invadmin@test.com','h','admin','Inv Admin') RETURNING id,email,role`
  ).get() as { id: string; email: string; role: string }
  adminToken = await signAccessToken({ sub: admin.id, email: admin.email, role: admin.role as 'admin' })

  const mesero = db.prepare(
    `INSERT INTO users (email,password_hash,role,nombre) VALUES ('invmesero@test.com','h','mesero','Inv Mesero') RETURNING id,email,role`
  ).get() as { id: string; email: string; role: string }
  meseroToken = await signAccessToken({ sub: mesero.id, email: mesero.email, role: mesero.role as 'mesero' })

  // Item with stock tracking (stock_qty=10, min_stock=3)
  const t = db.prepare(
    `INSERT INTO menu_items (name,category,price_cents,stock_qty,min_stock) VALUES ('Tracked Beer','cervezas',1200000,10,3) RETURNING id`
  ).get() as { id: string }
  trackedItemId = t.id

  // Item without stock tracking (stock_qty=-1)
  const u = db.prepare(
    `INSERT INTO menu_items (name,category,price_cents,stock_qty,min_stock) VALUES ('Untracked Rum','licores',8000000,-1,0) RETURNING id`
  ).get() as { id: string }
  untrackedItemId = u.id
})

afterAll(async () => { await app.close() })

describe('GET /inventory', () => {
  it('returns all items with stock fields for admin', async () => {
    const res = await app.inject({
      method: 'GET', url: '/inventory',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const items = res.json() as Array<{ id: string; stock_qty: number; min_stock: number; is_low_stock: number }>
    const tracked = items.find(i => i.id === trackedItemId)
    expect(tracked).toBeTruthy()
    expect(tracked?.stock_qty).toBe(10)
    expect(tracked?.is_low_stock).toBe(0)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/inventory' })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /inventory/alerts', () => {
  it('returns items at or below min_stock', async () => {
    // Set stock below minimum
    db.prepare('UPDATE menu_items SET stock_qty=2 WHERE id=?').run(trackedItemId)
    const res = await app.inject({
      method: 'GET', url: '/inventory/alerts',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { count: number; items: Array<{ id: string }> }
    expect(body.count).toBeGreaterThan(0)
    expect(body.items.some((i) => i.id === trackedItemId)).toBe(true)
    // Restore
    db.prepare('UPDATE menu_items SET stock_qty=10 WHERE id=?').run(trackedItemId)
  })
})

describe('POST /sales stock decrement', () => {
  it('decrements stock_qty for tracked items on sale', async () => {
    // Ensure stock is 10
    db.prepare('UPDATE menu_items SET stock_qty=10 WHERE id=?').run(trackedItemId)

    await app.inject({
      method: 'POST', url: '/sales',
      headers: { authorization: `Bearer ${meseroToken}` },
      payload: { payment_method: 'efectivo', items: [{ menu_item_id: trackedItemId, quantity: 3 }] },
    })

    const item = db.prepare('SELECT stock_qty FROM menu_items WHERE id=?').get(trackedItemId) as { stock_qty: number }
    expect(item.stock_qty).toBe(7) // 10 - 3
  })

  it('does NOT decrement stock_qty for untracked items (stock_qty=-1)', async () => {
    await app.inject({
      method: 'POST', url: '/sales',
      headers: { authorization: `Bearer ${meseroToken}` },
      payload: { payment_method: 'efectivo', items: [{ menu_item_id: untrackedItemId, quantity: 5 }] },
    })
    const item = db.prepare('SELECT stock_qty FROM menu_items WHERE id=?').get(untrackedItemId) as { stock_qty: number }
    expect(item.stock_qty).toBe(-1) // unchanged
  })
})

describe('PUT /inventory/:id/stock', () => {
  it('updates stock_qty and min_stock', async () => {
    const res = await app.inject({
      method: 'PUT', url: `/inventory/${trackedItemId}/stock`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { stock_qty: 50, min_stock: 5 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { stock_qty: number; min_stock: number }
    expect(body.stock_qty).toBe(50)
    expect(body.min_stock).toBe(5)
  })
})
