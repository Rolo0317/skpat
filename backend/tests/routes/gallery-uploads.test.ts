import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import FormData from 'form-data'
import { buildServer } from '../../src/app.js'
import { db } from '../../src/lib/db.js'
import { MAX_IMAGE_BYTES, setStorageProvider } from '../../src/lib/storage/index.js'
import { MemoryStorage } from '../../src/lib/storage/memoryStorage.js'
import { createEvent, createUser, IMAGE_BYTES, resetDb } from '../helpers.js'

const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000'

let app: FastifyInstance
let adminToken: string
let storage: MemoryStorage

const asAdmin = () => ({ authorization: `Bearer ${adminToken}` })

function imageForm(images: Buffer[], fields: Record<string, string> = {}) {
  const form = new FormData()
  for (const [name, value] of Object.entries(fields)) form.append(name, value)
  images.forEach((image, i) => form.append('file', image, { filename: `foto-${i}.png`, contentType: 'image/png' }))
  return form
}

const postForm = (url: string, form: FormData) =>
  app.inject({ method: 'POST', url, headers: { ...asAdmin(), ...form.getHeaders() }, payload: form })

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
})

beforeEach(async () => {
  await resetDb()
  storage = new MemoryStorage()
  setStorageProvider(storage)
  adminToken = (await createUser('admin')).token
})

afterAll(async () => {
  await resetDb()
  await app.close()
})

describe('POST /admin/uploads', () => {
  it.each(Object.entries(IMAGE_BYTES))('stores a %s image and returns url and pathname', async (format, bytes) => {
    const res = await postForm('/admin/uploads', imageForm([bytes]))
    expect(res.statusCode).toBe(201)
    const { url, pathname } = res.json()
    const extension = format === 'jpeg' ? 'jpg' : format
    expect(pathname).toMatch(new RegExp(`^anuncios/[0-9a-f-]{36}\\.${extension}$`))
    expect(url).toContain(pathname)
    expect(storage.files.get(pathname)?.contentType).toBe(`image/${format}`)
  })

  it('uses the requested folder', async () => {
    const res = await postForm('/admin/uploads?carpeta=flyers', imageForm([IMAGE_BYTES.png]))
    expect(res.json().pathname).toMatch(/^flyers\//)
    const bad = await postForm('/admin/uploads?carpeta=../etc', imageForm([IMAGE_BYTES.png]))
    expect(bad.statusCode).toBe(400)
  })

  it('rejects non-images (by content, not by declared type), missing files and JSON bodies', async () => {
    const fake = await postForm('/admin/uploads', imageForm([Buffer.from('<svg onload=alert(1)>')]))
    expect(fake.statusCode).toBe(415)
    expect(fake.json().error).toBe('UnsupportedImageType')

    const empty = await postForm('/admin/uploads', imageForm([], { otro: 'x' }))
    expect(empty.json().error).toBe('FileRequired')

    const json = await app.inject({ method: 'POST', url: '/admin/uploads', headers: asAdmin(), payload: {} })
    expect(json.json().error).toBe('MultipartRequired')
  })

  it('rejects files over 8 MB with 413 FileTooLarge', async () => {
    const huge = Buffer.concat([IMAGE_BYTES.png, Buffer.alloc(MAX_IMAGE_BYTES)])
    const res = await postForm('/admin/uploads', imageForm([huge]))
    expect(res.statusCode).toBe(413)
    expect(res.json().error).toBe('FileTooLarge')
    expect(storage.files.size).toBe(0)
  })

  it('requires admin', async () => {
    const form = imageForm([IMAGE_BYTES.png])
    const res = await app.inject({ method: 'POST', url: '/admin/uploads', headers: form.getHeaders(), payload: form })
    expect(res.statusCode).toBe(401)
  })
})

describe('gallery', () => {
  it('uploads several photos with event and caption; public GET filters by event, newest first', async () => {
    const eventId = await createEvent({ title: 'Maratoneados' })
    const otherEvent = await createEvent({ title: 'Otra' })
    const res = await postForm('/admin/gallery', imageForm([IMAGE_BYTES.png, IMAGE_BYTES.jpeg], { event_id: eventId, caption: 'Noche épica' }))
    expect(res.statusCode).toBe(201)
    expect(res.json()).toHaveLength(2)
    expect(res.json()[0]).toMatchObject({ event_id: eventId, event_title: 'Maratoneados', caption: 'Noche épica' })
    expect([...storage.files.keys()].every((key) => key.startsWith('galeria/'))).toBe(true)

    await postForm('/admin/gallery', imageForm([IMAGE_BYTES.gif], { event_id: otherEvent }))

    const filtered = (await app.inject({ method: 'GET', url: `/gallery?event_id=${eventId}` })).json()
    expect(filtered).toHaveLength(2)
    expect(Object.keys(filtered[0]).sort()).toEqual(['caption', 'created_at', 'event_id', 'event_title', 'id', 'url'])

    const all = (await app.inject({ method: 'GET', url: '/gallery' })).json()
    expect(all).toHaveLength(3)
    expect(all[0].event_id).toBe(otherEvent)
  })

  it('allows photos without event and validates the event', async () => {
    const res = await postForm('/admin/gallery', imageForm([IMAGE_BYTES.png]))
    expect(res.json()[0]).toMatchObject({ event_id: null, event_title: null, caption: null })

    const unknown = await postForm('/admin/gallery', imageForm([IMAGE_BYTES.png], { event_id: UNKNOWN_UUID }))
    expect(unknown.statusCode).toBe(404)
    expect(unknown.json().error).toBe('EventNotFound')
    expect(storage.files.size).toBe(1)

    const badQuery = await app.inject({ method: 'GET', url: '/gallery?event_id=nope' })
    expect(badQuery.statusCode).toBe(400)
  })

  it('stores nothing when one of the files is invalid', async () => {
    const res = await postForm('/admin/gallery', imageForm([IMAGE_BYTES.png, Buffer.from('not an image')]))
    expect(res.statusCode).toBe(415)
    expect(storage.files.size).toBe(0)
    expect((await db.many('select id from event_photos')).length).toBe(0)
  })

  it('admin GET includes the storage pathname; DELETE removes row and file', async () => {
    await postForm('/admin/gallery', imageForm([IMAGE_BYTES.png]))
    const [photo] = (await app.inject({ method: 'GET', url: '/admin/gallery', headers: asAdmin() })).json()
    expect(storage.files.has(photo.pathname)).toBe(true)

    const res = await app.inject({ method: 'DELETE', url: `/admin/gallery/${photo.id}`, headers: asAdmin() })
    expect(res.json()).toEqual({ ok: true })
    expect(storage.files.has(photo.pathname)).toBe(false)
    expect((await app.inject({ method: 'GET', url: '/gallery' })).json()).toEqual([])

    const again = await app.inject({ method: 'DELETE', url: `/admin/gallery/${photo.id}`, headers: asAdmin() })
    expect(again.statusCode).toBe(404)
    expect(again.json().error).toBe('PhotoNotFound')
  })
})
