import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../../src/server.js'
import type { FastifyInstance } from 'fastify'
import { db } from '../../src/lib/db.js'
import { signAccessToken } from '../../src/lib/jwt.js'

let app: FastifyInstance
let porteroToken: string
let adminToken: string
let clienteToken: string
let testEventId: string

beforeAll(async () => {
  app = await buildServer()
  await app.ready()

  // Clean up
  db.exec('DELETE FROM tickets')
  db.exec('DELETE FROM events')

  // Create a test event
  const row = db
    .prepare(
      "INSERT INTO events (title, date, price, is_active) VALUES ('Test Night', '2026-12-01T22:00:00Z', 3000000, 1) RETURNING id"
    )
    .get() as { id: string }
  testEventId = row.id

  porteroToken = await signAccessToken({ sub: 'portero-1', email: 'portero@test.co', role: 'portero' })
  adminToken = await signAccessToken({ sub: 'admin-1', email: 'admin@test.co', role: 'admin' })
  clienteToken = await signAccessToken({ sub: 'cliente-1', email: 'cliente@test.co', role: 'cliente' })
})

afterAll(async () => {
  db.exec('DELETE FROM tickets')
  db.exec('DELETE FROM events')
  await app.close()
})

describe('POST /tickets/purchase', () => {
  it('purchases a general ticket successfully', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/purchase',
      payload: {
        event_id: testEventId,
        nombre: 'Juan Perez',
        email: 'juan@test.co',
        cedula: '1234567890',
        telefono: '3001234567',
        ticket_type: 'general',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.ticket_id).toBeDefined()
    expect(body.qr_token).toHaveLength(64)
    expect(body.qr_data_url).toMatch(/^data:image\/png;base64,/)
    expect(body.event_title).toBe('Test Night')
    expect(body.ticket_type).toBe('general')
    expect(body.price_cents).toBe(3000000)
  })

  it('returns 404 for unknown event_id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/purchase',
      payload: {
        event_id: 'nonexistent',
        nombre: 'X',
        email: 'x@test.co',
        cedula: '12345',
        ticket_type: 'general',
      },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('EventNotFound')
  })

  it('returns 422 for inactive event', async () => {
    const inactive = db
      .prepare(
        "INSERT INTO events (title, date, price, is_active) VALUES ('Hidden', '2026-12-02T22:00:00Z', 1000, 0) RETURNING id"
      )
      .get() as { id: string }
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/purchase',
      payload: {
        event_id: inactive.id,
        nombre: 'X',
        email: 'x@test.co',
        cedula: '12345',
        ticket_type: 'general',
      },
    })
    expect(res.statusCode).toBe(422)
    expect(res.json().error).toBe('EventNotActive')
  })

  it('returns 400 for invalid cedula', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/purchase',
      payload: {
        event_id: testEventId,
        nombre: 'X',
        email: 'x@test.co',
        cedula: 'NOT-A-CEDULA',
        ticket_type: 'general',
      },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('ValidationError')
  })

  it('purchases a palco_gold ticket with correct price', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/purchase',
      payload: {
        event_id: testEventId,
        nombre: 'Maria Lopez',
        email: 'maria@test.co',
        cedula: '9876543210',
        ticket_type: 'palco_gold',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.ticket_type).toBe('palco_gold')
    expect(body.price_cents).toBe(40000_00) // $400.000 COP
  })
})

describe('POST /tickets/scan', () => {
  let validToken: string

  beforeAll(async () => {
    // Create a fresh ticket for scan tests
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/purchase',
      payload: {
        event_id: testEventId,
        nombre: 'Scan Test User',
        email: 'scan@test.co',
        cedula: '11111111',
        ticket_type: 'general',
      },
    })
    validToken = res.json().qr_token
  })

  it('returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/scan',
      payload: { qr_token: 'anything' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 with cliente role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/scan',
      headers: { authorization: `Bearer ${clienteToken}` },
      payload: { qr_token: 'anything' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('validates a valid QR token as portero', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/scan',
      headers: { authorization: `Bearer ${porteroToken}` },
      payload: { qr_token: validToken },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.valid).toBe(true)
    expect(body.nombre).toBe('Scan Test User')
    expect(body.ticket_type).toBe('general')
    expect(body.event_title).toBe('Test Night')
  })

  it('rejects a duplicate scan (already used)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/scan',
      headers: { authorization: `Bearer ${porteroToken}` },
      payload: { qr_token: validToken },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.valid).toBe(false)
    expect(body.reason).toBe('AlreadyUsed')
  })

  it('returns invalid for unknown QR token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/scan',
      headers: { authorization: `Bearer ${porteroToken}` },
      payload: { qr_token: 'a'.repeat(64) },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.valid).toBe(false)
    expect(body.reason).toBe('InvalidQR')
  })
})

describe('GET /tickets/event/:event_id (admin attendee list)', () => {
  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: `/tickets/event/${testEventId}` })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 with portero role', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/tickets/event/${testEventId}`,
      headers: { authorization: `Bearer ${porteroToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns attendee list for admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/tickets/event/${testEventId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.event_id).toBe(testEventId)
    expect(body.event_title).toBe('Test Night')
    expect(Array.isArray(body.attendees)).toBe(true)
    expect(body.total).toBeGreaterThanOrEqual(1)
    // PII decrypted
    const attendee = body.attendees[0]
    expect(attendee.cedula).toMatch(/^\d+$/)
    expect(typeof attendee.qr_used).toBe('boolean')
  })

  it('returns 404 for unknown event', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tickets/event/nonexistent',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('POST /tickets/purchase — concurrency and spot decrement', () => {
  it('decrements available_spots by 1 on successful purchase', async () => {
    const evt = db.prepare(
      "INSERT INTO events (title, date, price, available_spots, is_active) VALUES ('Decrement Night', '2026-12-15T22:00:00Z', 1000, 50, 1) RETURNING id"
    ).get() as { id: string }

    const res = await app.inject({
      method: 'POST',
      url: '/tickets/purchase',
      payload: {
        event_id: evt.id,
        nombre: 'Dec User',
        email: 'dec@test.co',
        cedula: '11112222',
        ticket_type: 'general',
      },
    })
    expect(res.statusCode).toBe(201)

    const after = db.prepare('SELECT available_spots FROM events WHERE id = ?').get(evt.id) as { available_spots: number }
    expect(after.available_spots).toBe(49)
  })

  it('returns 422 SoldOut when available_spots is 0', async () => {
    const evt = db.prepare(
      "INSERT INTO events (title, date, price, available_spots, is_active) VALUES ('Sold Out Night', '2026-12-16T22:00:00Z', 1000, 0, 1) RETURNING id"
    ).get() as { id: string }

    const res = await app.inject({
      method: 'POST',
      url: '/tickets/purchase',
      payload: {
        event_id: evt.id,
        nombre: 'Sold User',
        email: 'sold@test.co',
        cedula: '22223333',
        ticket_type: 'general',
      },
    })
    expect(res.statusCode).toBe(422)
    expect(res.json().error).toBe('SoldOut')

    const count = db.prepare('SELECT COUNT(*) AS n FROM tickets WHERE event_id = ?').get(evt.id) as { n: number }
    expect(count.n).toBe(0)
  })

  it('exhausts available_spots sequentially without going negative', async () => {
    const evt = db.prepare(
      "INSERT INTO events (title, date, price, available_spots, is_active) VALUES ('Last Spot Night', '2026-12-17T22:00:00Z', 1000, 1, 1) RETURNING id"
    ).get() as { id: string }

    const ok = await app.inject({
      method: 'POST',
      url: '/tickets/purchase',
      payload: {
        event_id: evt.id, nombre: 'A', email: 'a@test.co', cedula: '33334444', ticket_type: 'general',
      },
    })
    expect(ok.statusCode).toBe(201)

    const fail = await app.inject({
      method: 'POST',
      url: '/tickets/purchase',
      payload: {
        event_id: evt.id, nombre: 'B', email: 'b@test.co', cedula: '44445555', ticket_type: 'general',
      },
    })
    expect(fail.statusCode).toBe(422)
    expect(fail.json().error).toBe('SoldOut')

    const after = db.prepare('SELECT available_spots FROM events WHERE id = ?').get(evt.id) as { available_spots: number }
    expect(after.available_spots).toBe(0)
  })
})
