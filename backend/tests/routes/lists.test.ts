import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../../src/app.js'
import { db } from '../../src/lib/db.js'
import { listRegistrationRateLimitConfig } from '../../src/plugins/rateLimiter.js'
import { createEvent, createPromoter, createUser, resetDb } from '../helpers.js'

const DAY_MS = 24 * 60 * 60 * 1000
const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000'

let app: FastifyInstance
let adminToken: string

const asAdmin = () => ({ authorization: `Bearer ${adminToken}` })
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString()

const guest = (n: number) => ({ nombre: `Invitado ${n}`, email: `invitado${n}@test.co`, cedula: `10203040${n}` })

async function createList(payload: Record<string, unknown>) {
  const res = await app.inject({ method: 'POST', url: '/admin/lists', headers: asAdmin(), payload })
  expect(res.statusCode).toBe(201)
  return res.json() as { id: string; slug: string }
}

/** Cada registro sale de una IP distinta para que el límite por IP no interfiera entre pruebas. */
let requestCounter = 0
const uniqueIp = () => `10.0.${Math.floor(++requestCounter / 250)}.${requestCounter % 250}`

const register = (slug: string, payload: Record<string, unknown>, remoteAddress = uniqueIp()) =>
  app.inject({ method: 'POST', url: `/lists/${slug}/registro`, payload, remoteAddress })

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
})

beforeEach(async () => {
  await resetDb()
  adminToken = (await createUser('admin')).token
})

afterAll(async () => {
  await resetDb()
  await app.close()
})

describe('/admin/lists', () => {
  it('generates a slug from the name and adds a suffix when it collides', async () => {
    const eventId = await createEvent()
    expect((await createList({ event_id: eventId, nombre: 'Lista VIP de Simón' })).slug).toBe('lista-vip-de-simon')
    expect((await createList({ event_id: eventId, nombre: 'Lista VIP de Simón' })).slug).toBe('lista-vip-de-simon-2')
    expect((await createList({ event_id: eventId, nombre: 'Lista VIP  de simon!' })).slug).toBe('lista-vip-de-simon-3')
    expect((await createList({ event_id: eventId, nombre: '¡¡!!' })).slug).toBe('lista')
  })

  it('accepts an explicit slug and answers 409 SlugTaken when it is taken', async () => {
    const eventId = await createEvent()
    await createList({ event_id: eventId, nombre: 'Uno', slug: 'cumple-ana' })
    const res = await app.inject({ method: 'POST', url: '/admin/lists', headers: asAdmin(), payload: { event_id: eventId, nombre: 'Dos', slug: 'cumple-ana' } })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toBe('SlugTaken')
  })

  it('validates event and promoter references', async () => {
    const res = await app.inject({ method: 'POST', url: '/admin/lists', headers: asAdmin(), payload: { event_id: UNKNOWN_UUID, nombre: 'X' } })
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('EventNotFound')

    const eventId = await createEvent()
    const promoter = await app.inject({
      method: 'POST', url: '/admin/lists', headers: asAdmin(), payload: { event_id: eventId, nombre: 'X', promoter_id: UNKNOWN_UUID },
    })
    expect(promoter.json().error).toBe('PromoterNotFound')
  })

  it('lists with event title, promoter and inscritos; filters by event; updates and deletes', async () => {
    const eventId = await createEvent({ title: 'Maratoneados' })
    const otherEvent = await createEvent({ title: 'Otra' })
    const promoterId = await createPromoter({ nombre: 'Info eventos' })
    const list = await createList({ event_id: eventId, nombre: 'General', promoter_id: promoterId })
    await createList({ event_id: otherEvent, nombre: 'Otra lista' })
    await register(list.slug, guest(1))

    const res = await app.inject({ method: 'GET', url: `/admin/lists?event_id=${eventId}`, headers: asAdmin() })
    expect(res.json()).toHaveLength(1)
    expect(res.json()[0]).toMatchObject({ nombre: 'General', event_title: 'Maratoneados', promoter_nombre: 'Info eventos', inscritos: 1 })

    const patched = await app.inject({ method: 'PATCH', url: `/admin/lists/${list.id}`, headers: asAdmin(), payload: { cupo: 50, activa: false } })
    expect(patched.json()).toMatchObject({ cupo: 50, activa: false, slug: list.slug })

    const deleted = await app.inject({ method: 'DELETE', url: `/admin/lists/${list.id}`, headers: asAdmin() })
    expect(deleted.json()).toEqual({ ok: true })
    expect((await app.inject({ method: 'GET', url: `/lists/${list.slug}` })).statusCode).toBe(404)
  })

  it('GET /admin/lists/:id/inscritos returns decrypted cédulas', async () => {
    const list = await createList({ event_id: await createEvent(), nombre: 'General' })
    await register(list.slug, { ...guest(1), telefono: '3001234567' })
    const res = await app.inject({ method: 'GET', url: `/admin/lists/${list.id}/inscritos`, headers: asAdmin() })
    expect(res.statusCode).toBe(200)
    expect(res.json().lista).toMatchObject({ id: list.id, inscritos: 1 })
    expect(res.json().inscritos).toEqual([
      expect.objectContaining({ nombre: 'Invitado 1', email: 'invitado1@test.co', cedula: '102030401', qr_used: false }),
    ])

    const missing = await app.inject({ method: 'GET', url: `/admin/lists/${UNKNOWN_UUID}/inscritos`, headers: asAdmin() })
    expect(missing.json().error).toBe('ListNotFound')
  })

  it('requires admin', async () => {
    const { token } = await createUser('cliente')
    const res = await app.inject({ method: 'GET', url: '/admin/lists', headers: { authorization: `Bearer ${token}` } })
    expect(res.statusCode).toBe(403)
  })
})

describe('GET /lists/:slug', () => {
  it('shows the list with event, quota and the list promoter', async () => {
    await createPromoter({ nombre: 'Primero', whatsapp: '+573000000001' })
    const promoterId = await createPromoter({ nombre: 'De la lista', whatsapp: '+573000000002' })
    const eventId = await createEvent({ title: 'Maratoneados' })
    const list = await createList({ event_id: eventId, nombre: 'General', cupo: 10, promoter_id: promoterId })

    const res = await app.inject({ method: 'GET', url: `/lists/${list.slug}` })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      nombre: 'General', evento: { id: eventId, title: 'Maratoneados' }, cupo: 10, inscritos: 0, cierra_at: null,
      abierta: true, gestor: { id: promoterId, nombre: 'De la lista' },
    })
  })

  it('falls back to the first active promoter and returns 404 for unknown slugs', async () => {
    const first = await createPromoter({ nombre: 'Primero' })
    const list = await createList({ event_id: await createEvent(), nombre: 'General' })
    expect((await app.inject({ method: 'GET', url: `/lists/${list.slug}` })).json().gestor.id).toBe(first)

    const res = await app.inject({ method: 'GET', url: '/lists/no-existe' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('ListNotFound')
  })

  it.each([
    ['inactive list', { activa: false }, {}],
    ['closing date passed', { cierra_at: daysFromNow(-1) }, {}],
    ['inactive event', {}, { is_active: false }],
    ['event already over', {}, { date: daysFromNow(-2) }],
  ])('is closed when %s', async (_case, listFields, eventFields) => {
    const list = await createList({ event_id: await createEvent(eventFields), nombre: 'General', ...listFields })
    expect((await app.inject({ method: 'GET', url: `/lists/${list.slug}` })).json().abierta).toBe(false)
    const res = await register(list.slug, guest(1))
    expect(res.statusCode).toBe(422)
    expect(res.json().error).toBe('ListClosed')
  })
})

describe('POST /lists/:slug/registro', () => {
  it('registers a confirmed free ticket with its own QR and discounts event capacity', async () => {
    const promoterId = await createPromoter()
    const eventId = await createEvent({ title: 'Maratoneados', available_spots: 5 })
    const list = await createList({ event_id: eventId, nombre: 'General', promoter_id: promoterId })

    const res = await register(list.slug, guest(1))
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toMatchObject({ event_title: 'Maratoneados' })
    expect(body.qr_data_url).toMatch(/^data:image\/png;base64,/)

    const ticket = await db.one<Record<string, unknown>>('select * from tickets where id = $1', [body.ticket_id])
    expect(ticket).toMatchObject({
      ticket_type: 'lista', status: 'confirmed', price_cents: 0, guest_list_id: list.id, promoter_id: promoterId, qr_token: body.qr_token,
    })
    expect(ticket!.confirmed_at).not.toBeNull()
    const event = await db.one<{ available_spots: number }>('select available_spots from events where id = $1', [eventId])
    expect(event!.available_spots).toBe(4)
  })

  it('answers 409 AlreadyOnList for the same email and event (even on another list)', async () => {
    const eventId = await createEvent()
    const list = await createList({ event_id: eventId, nombre: 'Uno' })
    const other = await createList({ event_id: eventId, nombre: 'Dos' })
    await register(list.slug, guest(1))
    const res = await register(other.slug, { ...guest(1), email: 'INVITADO1@test.co' })
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toBe('AlreadyOnList')
  })

  it('answers 422 ListFull when the quota is reached and SoldOut when the event is full', async () => {
    const list = await createList({ event_id: await createEvent(), nombre: 'Corta', cupo: 1 })
    expect((await register(list.slug, guest(1))).statusCode).toBe(201)
    const full = await register(list.slug, guest(2))
    expect(full.statusCode).toBe(422)
    expect(full.json().error).toBe('ListFull')
    expect((await app.inject({ method: 'GET', url: `/lists/${list.slug}` })).json()).toMatchObject({ abierta: false, inscritos: 1 })

    const soldOut = await createList({ event_id: await createEvent({ available_spots: 0 }), nombre: 'Agotada' })
    expect((await register(soldOut.slug, guest(3))).json().error).toBe('SoldOut')
  })

  it('validates the body and returns 404 for unknown lists', async () => {
    const list = await createList({ event_id: await createEvent(), nombre: 'General' })
    expect((await register(list.slug, { nombre: 'X', email: 'no-email', cedula: '1' })).statusCode).toBe(400)
    expect((await register('no-existe', guest(1))).statusCode).toBe(404)
  })

  it('is rate limited per IP', async () => {
    const list = await createList({ event_id: await createEvent(), nombre: 'General' })
    const sameIp = '192.168.50.1'
    const attempts = listRegistrationRateLimitConfig.max + 1
    const statuses: number[] = []
    for (let n = 0; n < attempts; n++) statuses.push((await register(list.slug, guest(n), sameIp)).statusCode)
    expect(statuses.at(-1)).toBe(429)
    expect(statuses.slice(0, -1).every((status) => status === 201)).toBe(true)
  })
})
