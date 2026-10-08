import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import FormData from 'form-data'
import { buildServer } from '../../src/app.js'
import { db } from '../../src/lib/db.js'
import { createEvent, createUser, IMAGE_BYTES, resetDb } from '../helpers.js'
import { setStorageProvider } from '../../src/lib/storage/index.js'
import { MemoryStorage } from '../../src/lib/storage/memoryStorage.js'

const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000'

let app: FastifyInstance
let adminToken: string
let userToken: string

const asAdmin = () => ({ authorization: `Bearer ${adminToken}` })

function eventForm(fields: Record<string, string>) {
  const form = new FormData()
  for (const [name, value] of Object.entries(fields)) form.append(name, value)
  return form
}

const postJson = (payload: Record<string, unknown>) =>
  app.inject({ method: 'POST', url: '/events', headers: asAdmin(), payload })

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
})

beforeEach(async () => {
  await resetDb()
  adminToken = (await createUser('admin')).token
  userToken = (await createUser('cliente')).token
})

afterAll(async () => {
  await resetDb()
  await app.close()
})

describe('GET /events', () => {
  it('returns empty array when no events exist', async () => {
    const res = await app.inject({ method: 'GET', url: '/events' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('returns only active events, with flags as 0/1 and lineup/genre', async () => {
    await createEvent({ title: 'Live', is_active: true })
    await createEvent({ title: 'Hidden', is_active: false })
    const body = (await app.inject({ method: 'GET', url: '/events' })).json()
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({ title: 'Live', is_active: 1, is_vip: 0, lineup: [], genre: null })
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
    const form = eventForm({
      title: 'Guaracha Night', date: '2026-06-15T22:00:00Z', description: 'Test event',
      price: '3000000', available_spots: '120', is_vip: '0', lineup: 'DJ Uno, DJ Dos', genre: 'guaracha',
    })
    const res = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { ...asAdmin(), ...form.getHeaders() },
      payload: form,
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({
      title: 'Guaracha Night', price: 3000000, available_spots: 120, is_active: 1, is_vip: 0,
      lineup: ['DJ Uno', 'DJ Dos'], genre: 'guaracha', image_url: null,
    })
  })

  it('creates event from JSON with image_url, lineup array and genre', async () => {
    const res = await postJson({
      title: 'Techno Bunker', date: '2026-07-04T03:00:00Z', price: 5000000, is_vip: true,
      image_url: '/flyers/techno-bunker.jpg', lineup: ['Artista A', 'Artista B'], genre: 'techno',
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({
      title: 'Techno Bunker', is_vip: 1, available_spots: 100,
      image_url: '/flyers/techno-bunker.jpg', lineup: ['Artista A', 'Artista B'], genre: 'techno',
    })
  })

  it('rejects an image_url that is neither http(s) nor root-relative', async () => {
    const res = await postJson({ title: 'Bad Image', date: '2026-07-04T03:00:00Z', price: 0, image_url: 'javascript:alert(1)' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('ValidationError')
  })

  it('returns 400 ValidationError for missing required fields', async () => {
    const res = await postJson({ title: 'No date' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('ValidationError')
  })

  describe('flyer upload (multipart image)', () => {
    const postFlyer = (image: Buffer) => {
      const form = eventForm({ title: 'Upload Night', date: '2026-06-15T22:00:00Z', price: '1000' })
      form.append('image', image, { filename: 'flyer.jpg', contentType: 'image/jpeg' })
      return app.inject({ method: 'POST', url: '/events', headers: { ...asAdmin(), ...form.getHeaders() }, payload: form })
    }

    it('stores the flyer through the storage provider under flyers/', async () => {
      const storage = new MemoryStorage()
      setStorageProvider(storage)
      const res = await postFlyer(IMAGE_BYTES.jpeg)
      expect(res.statusCode).toBe(201)
      const [pathname] = [...storage.files.keys()]
      expect(pathname).toMatch(/^flyers\/[0-9a-f-]{36}\.jpg$/)
      expect(res.json().image_url).toBe(`https://memoria.skpat.test/${pathname}`)
    })

    it('rejects a file that is not a supported image', async () => {
      const res = await postFlyer(Buffer.from('fake-image'))
      expect(res.statusCode).toBe(415)
      expect(res.json().error).toBe('UnsupportedImageType')
    })

    it('returns 503 ImageUploadUnavailable when no storage is configured', async () => {
      setStorageProvider(null)
      const res = await postFlyer(IMAGE_BYTES.jpeg)
      expect(res.statusCode).toBe(503)
      expect(res.json().error).toBe('ImageUploadUnavailable')
    })
  })
})

describe('PUT /events/:id', () => {
  it('updates event with admin token', async () => {
    const id = await createEvent({ title: 'Old' })
    const res = await app.inject({ method: 'PUT', url: `/events/${id}`, headers: asAdmin(), payload: { title: 'New' } })
    expect(res.statusCode).toBe(200)
    expect(res.json().title).toBe('New')
  })

  it('updates lineup, genre and image_url', async () => {
    const id = await createEvent()
    const res = await app.inject({
      method: 'PUT',
      url: `/events/${id}`,
      headers: asAdmin(),
      payload: { lineup: ['Nuevo DJ'], genre: 'afro house', image_url: 'https://cdn.example.com/f.jpg' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ lineup: ['Nuevo DJ'], genre: 'afro house', image_url: 'https://cdn.example.com/f.jpg' })
  })

  it('returns 400 NoFieldsToUpdate for an empty body', async () => {
    const id = await createEvent()
    const res = await app.inject({ method: 'PUT', url: `/events/${id}`, headers: asAdmin(), payload: {} })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('NoFieldsToUpdate')
  })

  it.each(['not-a-uuid', UNKNOWN_UUID])('returns 404 for unknown id %s', async (id) => {
    const res = await app.inject({ method: 'PUT', url: `/events/${id}`, headers: asAdmin(), payload: { title: 'Nope' } })
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('EventNotFound')
  })
})

describe('DELETE /events/:id', () => {
  it('soft-deletes event (is_active=false)', async () => {
    const id = await createEvent({ title: 'Bye' })
    const res = await app.inject({ method: 'DELETE', url: `/events/${id}`, headers: asAdmin() })
    expect(res.statusCode).toBe(200)
    const row = await db.one<{ is_active: boolean }>('select is_active from events where id = $1', [id])
    expect(row!.is_active).toBe(false)
  })

  it.each(['not-a-uuid', UNKNOWN_UUID])('returns 404 for unknown id %s', async (id) => {
    const res = await app.inject({ method: 'DELETE', url: `/events/${id}`, headers: asAdmin() })
    expect(res.statusCode).toBe(404)
  })
})
