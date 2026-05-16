import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/server.js'
import { db } from '../../src/lib/db.js'
import { signAccessToken } from '../../src/lib/jwt.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let meseroToken: string
let adminToken: string
let testItemId: string

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
  const mesero = db.prepare(`INSERT INTO users (email,password_hash,role,nombre) VALUES ('mesero@test.com','hash','mesero','Mesero Test') RETURNING id,email,role`).get() as { id: string; email: string; role: string }
  meseroToken = await signAccessToken({ sub: mesero.id, email: mesero.email, role: mesero.role as 'mesero' })
  const admin = db.prepare(`INSERT INTO users (email,password_hash,role,nombre) VALUES ('salesadmin@test.com','hash','admin','Sales Admin') RETURNING id,email,role`).get() as { id: string; email: string; role: string }
  adminToken = await signAccessToken({ sub: admin.id, email: admin.email, role: admin.role as 'admin' })
  const item = db.prepare(`INSERT INTO menu_items (name,category,price_cents) VALUES ('Club Colombia','cervezas',1200000) RETURNING id`).get() as { id: string }
  testItemId = item.id
})
afterAll(async () => { await app.close() })

describe('POST /sales', () => {
  it('creates sale and returns sale_id + total', async () => {
    const res = await app.inject({
      method: 'POST', url: '/sales',
      headers: { authorization: `Bearer ${meseroToken}` },
      payload: { table_number: 3, payment_method: 'nequi', items: [{ menu_item_id: testItemId, quantity: 2 }] },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.sale_id).toBeTruthy()
    expect(body.total_cents).toBe(2400000)
  })
  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/sales', payload: { items: [] } })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /sales/mine', () => {
  it('returns mesero own sales with total_tonight_cents', async () => {
    const res = await app.inject({ method: 'GET', url: '/sales/mine', headers: { authorization: `Bearer ${meseroToken}` } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.sales)).toBe(true)
    expect(typeof body.total_tonight_cents).toBe('number')
  })
})

describe('GET /sales/tonight', () => {
  it('returns sales grouped by mesero for admin', async () => {
    const res = await app.inject({ method: 'GET', url: '/sales/tonight', headers: { authorization: `Bearer ${adminToken}` } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.by_mesero)).toBe(true)
    expect(typeof body.grand_total_cents).toBe('number')
  })
  it('returns 403 for mesero role', async () => {
    const res = await app.inject({ method: 'GET', url: '/sales/tonight', headers: { authorization: `Bearer ${meseroToken}` } })
    expect(res.statusCode).toBe(403)
  })
})
