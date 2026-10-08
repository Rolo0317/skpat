import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../../src/app.js'
import { createEvent, createUser, resetDb } from '../helpers.js'

const HOUR_MS = 60 * 60 * 1000
const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000'

let app: FastifyInstance
let adminToken: string

const asAdmin = () => ({ authorization: `Bearer ${adminToken}` })
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * HOUR_MS).toISOString()

const createAnnouncement = (payload: Record<string, unknown>) =>
  app.inject({ method: 'POST', url: '/admin/announcements', headers: asAdmin(), payload })

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

describe('announcements', () => {
  it('public GET returns only current active announcements, pinned first', async () => {
    await createAnnouncement({ titulo: 'Normal', starts_at: hoursFromNow(-2) })
    await createAnnouncement({ titulo: 'Fijado', fijado: true, starts_at: hoursFromNow(-3) })
    await createAnnouncement({ titulo: 'Futuro', starts_at: hoursFromNow(5) })
    await createAnnouncement({ titulo: 'Vencido', starts_at: hoursFromNow(-5), ends_at: hoursFromNow(-1) })
    await createAnnouncement({ titulo: 'Inactivo', activo: false })

    const res = await app.inject({ method: 'GET', url: '/announcements' })
    expect(res.statusCode).toBe(200)
    expect(res.json().map((a: { titulo: string }) => a.titulo)).toEqual(['Fijado', 'Normal'])

    const admin = await app.inject({ method: 'GET', url: '/admin/announcements', headers: asAdmin() })
    expect(admin.json()).toHaveLength(5)
  })

  it('creates with all fields, links an event, updates and deletes', async () => {
    const eventId = await createEvent()
    const res = await createAnnouncement({
      titulo: 'Invitados especiales', cuerpo: 'Simon Correa y Santiago Cardona', image_url: 'https://cdn.example.com/a.jpg',
      cta_label: 'Reservar', cta_url: '/eventos', event_id: eventId,
    })
    expect(res.statusCode).toBe(201)
    const created = res.json()
    expect(created).toMatchObject({ titulo: 'Invitados especiales', event_id: eventId, activo: true, fijado: false })

    const patched = await app.inject({ method: 'PATCH', url: `/admin/announcements/${created.id}`, headers: asAdmin(), payload: { fijado: true, cuerpo: '' } })
    expect(patched.json()).toMatchObject({ fijado: true, cuerpo: null })

    const deleted = await app.inject({ method: 'DELETE', url: `/admin/announcements/${created.id}`, headers: asAdmin() })
    expect(deleted.json()).toEqual({ ok: true })
    const missing = await app.inject({ method: 'PATCH', url: `/admin/announcements/${created.id}`, headers: asAdmin(), payload: { titulo: 'x' } })
    expect(missing.json().error).toBe('AnnouncementNotFound')
  })

  it('validates title, URLs, dates and the linked event', async () => {
    expect((await createAnnouncement({})).statusCode).toBe(400)
    expect((await createAnnouncement({ titulo: 'x', cta_url: 'javascript:alert(1)' })).statusCode).toBe(400)
    expect((await createAnnouncement({ titulo: 'x', starts_at: hoursFromNow(2), ends_at: hoursFromNow(1) })).statusCode).toBe(400)

    const unknownEvent = await createAnnouncement({ titulo: 'x', event_id: UNKNOWN_UUID })
    expect(unknownEvent.statusCode).toBe(404)
    expect(unknownEvent.json().error).toBe('EventNotFound')
  })

  it('admin routes require the admin role', async () => {
    const { token } = await createUser('portero')
    const res = await app.inject({ method: 'POST', url: '/admin/announcements', headers: { authorization: `Bearer ${token}` }, payload: { titulo: 'x' } })
    expect(res.statusCode).toBe(403)
  })
})
