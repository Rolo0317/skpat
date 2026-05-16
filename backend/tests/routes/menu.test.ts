import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/server.js'
import { db } from '../../src/lib/db.js'
import { signAccessToken } from '../../src/lib/jwt.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance
let adminToken: string

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
  const admin = db.prepare(`INSERT INTO users (email, password_hash, role, nombre) VALUES ('menuadmin@test.com','hash','admin','Menu Admin') RETURNING id,email,role`).get() as { id: string; email: string; role: string }
  adminToken = await signAccessToken({ sub: admin.id, email: admin.email, role: admin.role as 'admin' })
})
afterAll(async () => { await app.close() })

describe('GET /menu', () => {
  it('returns active menu items without auth', async () => {
    db.prepare(`INSERT INTO menu_items (name, category, price_cents) VALUES ('Cerveza Test','cervezas',1200000)`).run()
    const res = await app.inject({ method: 'GET', url: '/menu' })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
    expect(res.json().some((i: { name: string }) => i.name === 'Cerveza Test')).toBe(true)
  })
})

describe('POST /menu', () => {
  it('creates menu item as admin', async () => {
    const res = await app.inject({
      method: 'POST', url: '/menu',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Ron Medellín', category: 'licores', price_cents: 8500000 },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().name).toBe('Ron Medellín')
  })
  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/menu', payload: { name: 'X', category: 'X', price_cents: 100 } })
    expect(res.statusCode).toBe(401)
  })
})

describe('PUT /menu/:id', () => {
  it('disables a menu item', async () => {
    const item = db.prepare(`INSERT INTO menu_items (name,category,price_cents) VALUES ('ToDisable','test',100) RETURNING id`).get() as { id: string }
    const res = await app.inject({
      method: 'PUT', url: `/menu/${item.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { is_active: false },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().is_active).toBe(0)
  })
})
