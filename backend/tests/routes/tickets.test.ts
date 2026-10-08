import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../../src/app.js'
import type { FastifyInstance } from 'fastify'
import { db } from '../../src/lib/db.js'
import { createUser, resetDb } from '../helpers.js'
import { PALCO_PRICES_CENTS } from '../../src/lib/ticketPrices.js'

let app: FastifyInstance
let porteroToken: string
let adminToken: string
let clienteToken: string
let testEventId: string

beforeAll(async () => {
  app = await buildServer()
  await app.ready()

  // Clean up
  await resetDb()

  // Create a test event
  const row = (await db.one("INSERT INTO events (title, date, price, is_active) VALUES ('Test Night', '2026-12-01T22:00:00Z', 3000000, true) RETURNING id")) as { id: string }
  testEventId = row.id

  porteroToken = (await createUser('portero')).token
  adminToken = (await createUser('admin')).token
  clienteToken = (await createUser('cliente')).token
})

afterAll(async () => {
  await resetDb()
  await app.close()
})

describe('POST /tickets/purchase', () => {
  it('links the ticket to the logged-in buyer so it shows up in /tickets/mine', async () => {
    const buyer = await createUser('cliente')
    const auth = { authorization: `Bearer ${buyer.token}` }
    const purchase = await app.inject({
      method: 'POST',
      url: '/tickets/purchase',
      headers: auth,
      payload: { event_id: testEventId, nombre: 'Ana', email: 'ana@test.co', cedula: '55556666', ticket_type: 'general' },
    })
    expect(purchase.statusCode).toBe(201)

    const mine = await app.inject({ method: 'GET', url: '/tickets/mine', headers: auth })
    expect(mine.json().map((t: { id: string }) => t.id)).toEqual([purchase.json().ticket_id])
  })

  it('still sells to anonymous buyers when the optional token is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/tickets/purchase',
      headers: { authorization: 'Bearer not-a-valid-token' },
      payload: { event_id: testEventId, nombre: 'Anon', email: 'anon@test.co', cedula: '77778888', ticket_type: 'general' },
    })
    expect(res.statusCode).toBe(201)
  })

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
    const inactive = (await db.one("INSERT INTO events (title, date, price, is_active) VALUES ('Hidden', '2026-12-02T22:00:00Z', 1000, false) RETURNING id")) as { id: string }
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
    expect(body.price_cents).toBe(PALCO_PRICES_CENTS.palco_gold)
  })
})

describe('POST /tickets/purchase — lista', () => {
  const inscripcion = (email: string) => ({
    event_id: testEventId, nombre: 'Lista Uno', email, cedula: '1234512345', ticket_type: 'lista',
  })

  it('anota en la lista gratis y entrega un QR propio', async () => {
    const first = await app.inject({ method: 'POST', url: '/tickets/purchase', payload: inscripcion('lista1@test.co') })
    const second = await app.inject({ method: 'POST', url: '/tickets/purchase', payload: inscripcion('lista2@test.co') })

    expect(first.statusCode).toBe(201)
    expect(first.json()).toMatchObject({ ticket_type: 'lista', price_cents: 0 })
    expect(first.json().qr_token).toMatch(/^[0-9a-f]{64}$/)
    expect(second.json().qr_token).not.toBe(first.json().qr_token)
  })

  it('no deja anotar dos veces el mismo correo en el mismo evento', async () => {
    const before = (await db.one('SELECT available_spots FROM events WHERE id = $1', [testEventId])) as { available_spots: number }
    const repeated = await app.inject({ method: 'POST', url: '/tickets/purchase', payload: inscripcion('LISTA1@test.co') })
    const after = (await db.one('SELECT available_spots FROM events WHERE id = $1', [testEventId])) as { available_spots: number }

    expect(repeated.statusCode).toBe(409)
    expect(repeated.json().error).toBe('AlreadyOnList')
    expect(after.available_spots).toBe(before.available_spots)
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
    const evt = (await db.one("INSERT INTO events (title, date, price, available_spots, is_active) VALUES ('Decrement Night', '2026-12-15T22:00:00Z', 1000, 50, true) RETURNING id")) as { id: string }

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

    const after = (await db.one('SELECT available_spots FROM events WHERE id = $1', [evt.id])) as { available_spots: number }
    expect(after.available_spots).toBe(49)
  })

  it('returns 422 SoldOut when available_spots is 0', async () => {
    const evt = (await db.one("INSERT INTO events (title, date, price, available_spots, is_active) VALUES ('Sold Out Night', '2026-12-16T22:00:00Z', 1000, 0, true) RETURNING id")) as { id: string }

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

    const count = (await db.one('SELECT COUNT(*) AS n FROM tickets WHERE event_id = $1', [evt.id])) as { n: number }
    expect(count.n).toBe(0)
  })

  it('exhausts available_spots sequentially without going negative', async () => {
    const evt = (await db.one("INSERT INTO events (title, date, price, available_spots, is_active) VALUES ('Last Spot Night', '2026-12-17T22:00:00Z', 1000, 1, true) RETURNING id")) as { id: string }

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

    const after = (await db.one('SELECT available_spots FROM events WHERE id = $1', [evt.id])) as { available_spots: number }
    expect(after.available_spots).toBe(0)
  })
})
