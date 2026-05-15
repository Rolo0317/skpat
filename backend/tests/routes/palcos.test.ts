import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../../src/server.js'
import type { FastifyInstance } from 'fastify'
import { db } from '../../src/lib/db.js'

let app: FastifyInstance
let testEventId: string

beforeAll(async () => {
  app = await buildServer()
  await app.ready()

  db.exec('DELETE FROM palco_reservations')
  db.exec('DELETE FROM events')

  const row = db
    .prepare(
      "INSERT INTO events (title, date, price, is_active) VALUES ('Palco Night', '2026-12-10T22:00:00Z', 5000000, 1) RETURNING id"
    )
    .get() as { id: string }
  testEventId = row.id
})

afterAll(async () => {
  db.exec('DELETE FROM palco_reservations')
  db.exec('DELETE FROM events')
  await app.close()
})

describe('POST /palcos/reserve', () => {
  it('reserves a silver palco successfully', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/palcos/reserve',
      payload: {
        event_id: testEventId,
        palco_tier: 'silver',
        nombre: 'Carlos Ruiz',
        email: 'carlos@test.co',
        telefono: '3009876543',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.reservation_id).toBeDefined()
    expect(body.palco_tier).toBe('silver')
    expect(body.status).toBe('pending')
    expect(body.price_cents).toBe(20000_00)
    expect(body.event_title).toBe('Palco Night')
    expect(body.message).toBeDefined()
  })

  it('reserves a platinum palco with correct pricing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/palcos/reserve',
      payload: {
        event_id: testEventId,
        palco_tier: 'platinum',
        nombre: 'Ana Garcia',
        email: 'ana@test.co',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.price_cents).toBe(80000_00)
    expect(body.palco_tier).toBe('platinum')
  })

  it('returns 400 for missing nombre', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/palcos/reserve',
      payload: {
        event_id: testEventId,
        palco_tier: 'gold',
        email: 'x@test.co',
      },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('ValidationError')
  })

  it('returns 400 for invalid palco_tier', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/palcos/reserve',
      payload: {
        event_id: testEventId,
        palco_tier: 'diamond', // invalid
        nombre: 'X',
        email: 'x@test.co',
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 for unknown event', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/palcos/reserve',
      payload: {
        event_id: 'nonexistent',
        palco_tier: 'gold',
        nombre: 'X',
        email: 'x@test.co',
      },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('EventNotFound')
  })

  it('returns 422 for inactive event', async () => {
    const inactive = db
      .prepare(
        "INSERT INTO events (title, date, price, is_active) VALUES ('Closed', '2026-12-11T22:00:00Z', 1000, 0) RETURNING id"
      )
      .get() as { id: string }
    const res = await app.inject({
      method: 'POST',
      url: '/palcos/reserve',
      payload: {
        event_id: inactive.id,
        palco_tier: 'silver',
        nombre: 'X',
        email: 'x@test.co',
      },
    })
    expect(res.statusCode).toBe(422)
  })
})
