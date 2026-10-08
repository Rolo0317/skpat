import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../../src/app.js'
import { createPromoter, createUser, resetDb } from '../helpers.js'

const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000'

let app: FastifyInstance
let adminToken: string
let clientToken: string

const asAdmin = () => ({ authorization: `Bearer ${adminToken}` })

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
})

beforeEach(async () => {
  await resetDb()
  adminToken = (await createUser('admin')).token
  clientToken = (await createUser('cliente')).token
})

afterAll(async () => {
  await resetDb()
  await app.close()
})

describe('/admin/promoters', () => {
  it('requires the admin role', async () => {
    expect((await app.inject({ method: 'GET', url: '/admin/promoters' })).statusCode).toBe(401)
    const res = await app.inject({ method: 'GET', url: '/admin/promoters', headers: { authorization: `Bearer ${clientToken}` } })
    expect(res.statusCode).toBe(403)
  })

  it('creates a promoter normalizing the WhatsApp number', async () => {
    const res = await app.inject({
      method: 'POST', url: '/admin/promoters', headers: asAdmin(),
      payload: { nombre: 'Info eventos', whatsapp: '+57 320 875-1529' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ nombre: 'Info eventos', whatsapp: '+573208751529', activo: true })
  })

  it.each(['12345', '+57 abc 1234567', '+5732087515291234567'])('rejects invalid WhatsApp %s', async (whatsapp) => {
    const res = await app.inject({ method: 'POST', url: '/admin/promoters', headers: asAdmin(), payload: { nombre: 'X', whatsapp } })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('ValidationError')
  })

  it('lists all promoters, including inactive ones', async () => {
    await createPromoter({ nombre: 'Activo', whatsapp: '+573001110000' })
    await createPromoter({ nombre: 'Inactivo', whatsapp: '+573001110001', activo: false })
    const res = await app.inject({ method: 'GET', url: '/admin/promoters', headers: asAdmin() })
    expect(res.json().map((p: { nombre: string }) => p.nombre)).toEqual(['Activo', 'Inactivo'])
  })

  it('updates and deletes a promoter', async () => {
    const id = await createPromoter()
    const patched = await app.inject({ method: 'PATCH', url: `/admin/promoters/${id}`, headers: asAdmin(), payload: { activo: false } })
    expect(patched.statusCode).toBe(200)
    expect(patched.json()).toMatchObject({ id, activo: false })

    const deleted = await app.inject({ method: 'DELETE', url: `/admin/promoters/${id}`, headers: asAdmin() })
    expect(deleted.json()).toEqual({ ok: true })
    const again = await app.inject({ method: 'DELETE', url: `/admin/promoters/${id}`, headers: asAdmin() })
    expect(again.statusCode).toBe(404)
    expect(again.json().error).toBe('PromoterNotFound')
  })

  it('returns 400 NoFieldsToUpdate and 404 for unknown ids', async () => {
    const id = await createPromoter()
    const empty = await app.inject({ method: 'PATCH', url: `/admin/promoters/${id}`, headers: asAdmin(), payload: {} })
    expect(empty.json().error).toBe('NoFieldsToUpdate')
    for (const unknown of ['nope', UNKNOWN_UUID]) {
      const res = await app.inject({ method: 'PATCH', url: `/admin/promoters/${unknown}`, headers: asAdmin(), payload: { nombre: 'Y' } })
      expect(res.statusCode).toBe(404)
    }
  })
})

describe('PUT /admin/settings', () => {
  it('updates venue data and GET /settings reflects it with active promoters', async () => {
    await createPromoter({ nombre: 'Activo', whatsapp: '+573001110000' })
    await createPromoter({ nombre: 'Inactivo', whatsapp: '+573001110001', activo: false })
    const res = await app.inject({
      method: 'PUT', url: '/admin/settings', headers: asAdmin(),
      payload: { direccion: 'Calle 1 # 2-3', referencia: 'Sector Plaza de las Américas', mapa_url: 'https://maps.example.com/x' },
    })
    expect(res.statusCode).toBe(200)

    const settings = (await app.inject({ method: 'GET', url: '/settings' })).json()
    expect(settings).toMatchObject({
      direccion: 'Calle 1 # 2-3', referencia: 'Sector Plaza de las Américas', mapa_url: 'https://maps.example.com/x',
    })
    expect(settings.gestores.map((g: { nombre: string }) => g.nombre)).toEqual(['Activo'])
  })

  it('keeps omitted fields and clears fields sent as null or empty', async () => {
    await app.inject({ method: 'PUT', url: '/admin/settings', headers: asAdmin(), payload: { direccion: 'Calle 1', mapa_url: 'https://m.co/a' } })
    const res = await app.inject({ method: 'PUT', url: '/admin/settings', headers: asAdmin(), payload: { direccion: '  ', mapa_url: null } })
    expect(res.json()).toMatchObject({ direccion: null, mapa_url: null })

    const kept = await app.inject({ method: 'PUT', url: '/admin/settings', headers: asAdmin(), payload: { referencia: 'Ref' } })
    expect(kept.json()).toMatchObject({ direccion: null, referencia: 'Ref' })
  })

  it('rejects a non-http map URL and requires admin', async () => {
    const bad = await app.inject({ method: 'PUT', url: '/admin/settings', headers: asAdmin(), payload: { mapa_url: 'javascript:alert(1)' } })
    expect(bad.statusCode).toBe(400)
    const anon = await app.inject({ method: 'PUT', url: '/admin/settings', payload: {} })
    expect(anon.statusCode).toBe(401)
  })
})
