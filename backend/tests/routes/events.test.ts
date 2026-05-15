import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../../src/server.js'
import type { FastifyInstance } from 'fastify'
import { db } from '../../src/lib/db.js'
import { signAccessToken } from '../../src/lib/jwt.js'

let app: FastifyInstance
let adminToken: string
let userToken: string

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
  db.exec('DELETE FROM events')
  adminToken = await signAccessToken({ sub: 'test-admin', email: 'admin@test.co', role: 'admin' })
  userToken  = await signAccessToken({ sub: 'test-user',  email: 'user@test.co',  role: 'cliente' })
})

afterAll(async () => {
  await app.close()
})

describe('GET /events', () => {
  it('returns empty array when no events exist', async () => {
    db.exec('DELETE FROM events')
    const res = await app.inject({ method: 'GET', url: '/events' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual([])
  })

  it('returns only is_active=1 events', async () => {
    db.exec('DELETE FROM events')
    db.prepare("INSERT INTO events (title,date,price,is_active) VALUES ('Live', '2026-06-01T22:00:00Z', 30000, 1)").run()
    db.prepare("INSERT INTO events (title,date,price,is_active) VALUES ('Hidden', '2026-06-02T22:00:00Z', 30000, 0)").run()
    const res = await app.inject({ method: 'GET', url: '/events' })
    const body = JSON.parse(res.body)
    expect(body).toHaveLength(1)
    expect(body[0].title).toBe('Live')
  })
})

describe('POST /events', () => {
  it('returns 401 without bearer token', async () => {
    const res = await app.inject({ method: 'POST', url: '/events', payload: {} })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 with non-admin token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {},
    })
    expect(res.statusCode).toBe(403)
  })

  it('creates event with admin token (multipart, no file)', async () => {
    const FormData = (await import('form-data')).default
    const form = new FormData()
    form.append('title', 'Guaracha Night')
    form.append('date', '2026-06-15T22:00:00Z')
    form.append('description', 'Test event')
    form.append('price', '3000000')
    form.append('available_spots', '120')
    form.append('is_vip', '0')

    const res = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { authorization: `Bearer ${adminToken}`, ...form.getHeaders() },
      payload: form,
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.title).toBe('Guaracha Night')
    expect(body.price).toBe(3000000)
    expect(body.is_active).toBe(1)
  })
})

describe('PUT /events/:id', () => {
  it('updates event with admin token', async () => {
    db.exec('DELETE FROM events')
    const inserted = db.prepare(
      "INSERT INTO events (title,date,price) VALUES ('Old', '2026-06-01T22:00:00Z', 1000) RETURNING id"
    ).get() as { id: string }
    const res = await app.inject({
      method: 'PUT',
      url: `/events/${inserted.id}`,
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ title: 'New' }),
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).title).toBe('New')
  })
})

describe('DELETE /events/:id', () => {
  it('soft-deletes event (is_active=0)', async () => {
    db.exec('DELETE FROM events')
    const inserted = db.prepare(
      "INSERT INTO events (title,date,price) VALUES ('Bye', '2026-06-01T22:00:00Z', 1000) RETURNING id"
    ).get() as { id: string }
    const res = await app.inject({
      method: 'DELETE',
      url: `/events/${inserted.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const row = db.prepare('SELECT is_active FROM events WHERE id=?').get(inserted.id) as { is_active: number }
    expect(row.is_active).toBe(0)
  })
})
