import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../../src/app.js'
import type { FastifyInstance } from 'fastify'
import { createEvent, resetDb } from '../helpers.js'
import { PALCO_PRICES_CENTS } from '../../src/lib/ticketPrices.js'

let app: FastifyInstance
let testEventId: string

const reserve = (payload: Record<string, unknown>) => app.inject({ method: 'POST', url: '/palcos/reserve', payload })

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
  await resetDb()
  testEventId = await createEvent({ title: 'Palco Night', date: '2026-12-10T22:00:00Z', price: 5000000 })
})

afterAll(async () => {
  await resetDb()
  await app.close()
})

describe('POST /palcos/reserve', () => {
  it('reserves a silver palco successfully', async () => {
    const res = await reserve({
      event_id: testEventId, palco_tier: 'silver', nombre: 'Carlos Ruiz', email: 'carlos@test.co', telefono: '3009876543',
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.reservation_id).toBeDefined()
    expect(body.palco_tier).toBe('silver')
    expect(body.status).toBe('pending')
    expect(body.price_cents).toBe(PALCO_PRICES_CENTS.palco_silver)
    expect(body.event_title).toBe('Palco Night')
    expect(body.message).toContain('Palco Silver')
  })

  it('reserves a platinum palco with correct pricing', async () => {
    const res = await reserve({ event_id: testEventId, palco_tier: 'platinum', nombre: 'Ana Garcia', email: 'ana@test.co' })
    expect(res.statusCode).toBe(201)
    expect(res.json().price_cents).toBe(PALCO_PRICES_CENTS.palco_platinum)
    expect(res.json().palco_tier).toBe('platinum')
  })

  it('returns 400 for missing nombre', async () => {
    const res = await reserve({ event_id: testEventId, palco_tier: 'gold', email: 'x@test.co' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('ValidationError')
  })

  it('returns 400 for invalid palco_tier', async () => {
    const res = await reserve({ event_id: testEventId, palco_tier: 'diamond', nombre: 'X', email: 'x@test.co' })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 for a non-uuid event id', async () => {
    const res = await reserve({ event_id: 'nonexistent', palco_tier: 'gold', nombre: 'X', email: 'x@test.co' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('EventNotFound')
  })

  it('returns 404 for an unknown uuid event id', async () => {
    const res = await reserve({ event_id: crypto.randomUUID(), palco_tier: 'gold', nombre: 'X', email: 'x@test.co' })
    expect(res.statusCode).toBe(404)
  })

  it('returns 422 for inactive event', async () => {
    const inactiveId = await createEvent({ title: 'Closed', is_active: false })
    const res = await reserve({ event_id: inactiveId, palco_tier: 'silver', nombre: 'X', email: 'x@test.co' })
    expect(res.statusCode).toBe(422)
    expect(res.json().error).toBe('EventNotActive')
  })
})
