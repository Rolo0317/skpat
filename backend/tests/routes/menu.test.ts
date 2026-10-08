import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/app.js'
import type { FastifyInstance } from 'fastify'
import { createMenuItem, createUser, resetDb } from '../helpers.js'

let app: FastifyInstance
let adminToken: string

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
  await resetDb()
  adminToken = (await createUser('admin')).token
})

afterAll(async () => {
  await resetDb()
  await app.close()
})

const asAdmin = () => ({ authorization: `Bearer ${adminToken}` })

describe('GET /menu', () => {
  it('returns only active menu items without auth', async () => {
    await createMenuItem({ name: 'Cerveza Test' })
    await createMenuItem({ name: 'Hidden Item', is_active: false })
    const res = await app.inject({ method: 'GET', url: '/menu' })
    expect(res.statusCode).toBe(200)
    const names = (res.json() as Array<{ name: string }>).map((item) => item.name)
    expect(names).toContain('Cerveza Test')
    expect(names).not.toContain('Hidden Item')
  })
})

describe('POST /menu', () => {
  it('creates menu item as admin', async () => {
    const res = await app.inject({
      method: 'POST', url: '/menu', headers: asAdmin(),
      payload: { name: 'Ron Medellín', category: 'licores', price_cents: 8500000 },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().name).toBe('Ron Medellín')
    expect(res.json().is_active).toBe(true)
  })

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/menu', payload: { name: 'X', category: 'X', price_cents: 100 } })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 for a negative price', async () => {
    const res = await app.inject({ method: 'POST', url: '/menu', headers: asAdmin(), payload: { name: 'X', price_cents: -1 } })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('ValidationError')
  })
})

describe('PUT /menu/:id', () => {
  it('disables a menu item and keeps untouched fields', async () => {
    const itemId = await createMenuItem({ name: 'ToDisable', price_cents: 100 })
    const res = await app.inject({ method: 'PUT', url: `/menu/${itemId}`, headers: asAdmin(), payload: { is_active: false } })
    expect(res.statusCode).toBe(200)
    expect(res.json().is_active).toBe(false)
    expect(res.json().name).toBe('ToDisable')
    expect(res.json().price_cents).toBe(100)
  })

  it('returns 404 for a non-uuid id', async () => {
    const res = await app.inject({ method: 'PUT', url: '/menu/nonexistent', headers: asAdmin(), payload: { is_active: false } })
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('MenuItemNotFound')
  })

  it('returns 404 for an unknown uuid', async () => {
    const res = await app.inject({ method: 'PUT', url: `/menu/${crypto.randomUUID()}`, headers: asAdmin(), payload: { name: 'X' } })
    expect(res.statusCode).toBe(404)
  })
})
