import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../../src/app.js'
import type { FastifyInstance } from 'fastify'
import { db } from '../../src/lib/db.js'
import { createUser, resetDb } from '../helpers.js'

let app: FastifyInstance
let porteroToken: string
let adminToken: string
let clienteToken: string
let tonightEventId: string

const HOUR_MS = 60 * 60 * 1000
const TAQUILLA_CENTS = 3000000
const ETAPA_1_CENTS = 1000000

const insertEvent = async (title: string, date: Date, extra: { price?: number; spots?: number; active?: boolean } = {}) => {
  const row = await db.one<{ id: string }>(
    'insert into events (title, date, price, available_spots, is_active) values ($1, $2, $3, $4, $5) returning id',
    [title, date.toISOString(), extra.price ?? TAQUILLA_CENTS, extra.spots ?? 100, extra.active ?? true],
  )
  return row!.id
}

const buyer = (overrides: Record<string, unknown> = {}) => ({
  event_id: tonightEventId, nombre: 'Juan Perez', email: 'juan@test.co', cedula: '1234567890', ...overrides,
})

const purchase = (payload: Record<string, unknown>, headers: Record<string, string> = {}) =>
  app.inject({ method: 'POST', url: '/tickets/purchase', payload, headers })

const asAdmin = () => ({ authorization: `Bearer ${adminToken}` })
const asPortero = () => ({ authorization: `Bearer ${porteroToken}` })

const confirm = (ticketId: string) =>
  app.inject({ method: 'POST', url: `/admin/pagos/tiquetes/${ticketId}/confirmar`, headers: asAdmin() })

const scan = (qrToken: string) =>
  app.inject({ method: 'POST', url: '/tickets/scan', headers: asPortero(), payload: { qr_token: qrToken } })

const qrTokenOf = async (ticketId: string) =>
  (await db.one<{ qr_token: string }>('select qr_token from tickets where id = $1', [ticketId]))!.qr_token

const spotsLeft = async (eventId: string) =>
  (await db.one<{ available_spots: number }>('select available_spots from events where id = $1', [eventId]))!.available_spots

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
  await resetDb()
  tonightEventId = await insertEvent('Test Night', new Date())
  porteroToken = (await createUser('portero')).token
  adminToken = (await createUser('admin')).token
  clienteToken = (await createUser('cliente')).token
})

afterAll(async () => {
  await resetDb()
  await app.close()
})

describe('POST /tickets/purchase (sin pasarela: queda pendiente de pago)', () => {
  it('crea la compra pendiente, sin QR, al precio de taquilla cuando no hay etapas', async () => {
    const res = await purchase(buyer())
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toMatchObject({ status: 'pending_payment', price_cents: TAQUILLA_CENTS, price_stage: 'Taquilla' })
    expect(body.qr_data_url).toBeUndefined()
    expect(body.qr_token).toBeUndefined()
  })

  it('cobra la etapa vigente y devuelve el WhatsApp del gestor', async () => {
    const eventId = await insertEvent('Etapas Night', new Date(Date.now() + 48 * HOUR_MS))
    await db.run(
      `insert into event_price_stages (event_id, nombre, price_cents, ends_at, sort_order)
       values ($1, 'Etapa 1', $2, now() + interval '1 day', 1), ($1, 'Etapa 2', 1500000, null, 2)`,
      [eventId, ETAPA_1_CENTS],
    )
    await db.run(`insert into promoters (nombre, whatsapp) values ('Gestor Test', '+573001112233')`)

    const body = (await purchase(buyer({ event_id: eventId, email: 'etapa@test.co' }))).json()
    expect(body).toMatchObject({ price_cents: ETAPA_1_CENTS, price_stage: 'Etapa 1' })
    expect(body.whatsapp_url).toMatch(/^https:\/\/wa\.me\/573001112233\?text=/)
  })

  it('asocia la compra al usuario logueado y /tickets/mine la muestra pendiente con WhatsApp', async () => {
    const cliente = await createUser('cliente')
    const auth = { authorization: `Bearer ${cliente.token}` }
    const bought = await purchase(buyer({ email: 'ana@test.co' }), auth)

    const [mine] = (await app.inject({ method: 'GET', url: '/tickets/mine', headers: auth })).json()
    expect(mine).toMatchObject({ id: bought.json().ticket_id, status: 'pending_payment', qr_data_url: null })
    expect(mine.qr_token).toBeUndefined()
  })

  it('sigue vendiendo como anónimo si el token opcional es inválido', async () => {
    const res = await purchase(buyer({ email: 'anon@test.co' }), { authorization: 'Bearer not-a-valid-token' })
    expect(res.statusCode).toBe(201)
  })

  it('responde 404, 422 y 400 en los casos inválidos', async () => {
    const inactiveId = await insertEvent('Hidden', new Date(), { active: false })
    expect((await purchase(buyer({ event_id: 'nonexistent' }))).json().error).toBe('EventNotFound')
    expect((await purchase(buyer({ event_id: inactiveId }))).json().error).toBe('EventNotActive')
    expect((await purchase(buyer({ cedula: 'NOT-A-CEDULA' }))).json().error).toBe('ValidationError')
  })
})

describe('Pagos: confirmar y cancelar', () => {
  it('al confirmar, el QR se entrega y vale en la puerta; confirmar dos veces da 409', async () => {
    const ticketId = (await purchase(buyer({ email: 'paga@test.co' }))).json().ticket_id
    const confirmed = await confirm(ticketId)
    expect(confirmed.statusCode).toBe(200)
    expect(confirmed.json().qr_data_url).toMatch(/^data:image\/png;base64,/)

    expect((await confirm(ticketId)).json().error).toBe('AlreadyProcessed')
    expect((await scan(await qrTokenOf(ticketId))).json()).toMatchObject({ valid: true, nombre: 'Juan Perez' })
  })

  it('al cancelar devuelve el cupo al evento', async () => {
    const eventId = await insertEvent('Cancel Night', new Date(), { spots: 10 })
    const ticketId = (await purchase(buyer({ event_id: eventId, email: 'cancela@test.co' }))).json().ticket_id
    expect(await spotsLeft(eventId)).toBe(9)

    const res = await app.inject({ method: 'POST', url: `/admin/pagos/tiquetes/${ticketId}/cancelar`, headers: asAdmin() })
    expect(res.json().status).toBe('cancelled')
    expect(await spotsLeft(eventId)).toBe(10)
  })

  it('solo el admin ve los pendientes', async () => {
    const forbidden = await app.inject({
      method: 'GET', url: '/admin/pagos/pendientes', headers: { authorization: `Bearer ${clienteToken}` },
    })
    expect(forbidden.statusCode).toBe(403)

    const pending = (await app.inject({ method: 'GET', url: '/admin/pagos/pendientes', headers: asAdmin() })).json()
    expect(pending.tiquetes.length).toBeGreaterThan(0)
    expect(pending.tiquetes[0].qr_token).toBeUndefined()
  })
})

describe('POST /tickets/scan', () => {
  it('exige portero o admin', async () => {
    const anonymous = await app.inject({ method: 'POST', url: '/tickets/scan', payload: { qr_token: 'anything' } })
    const cliente = await app.inject({
      method: 'POST', url: '/tickets/scan', headers: { authorization: `Bearer ${clienteToken}` }, payload: { qr_token: 'anything' },
    })
    expect(anonymous.statusCode).toBe(401)
    expect(cliente.statusCode).toBe(403)
  })

  it('rechaza un QR con pago pendiente', async () => {
    const ticketId = (await purchase(buyer({ email: 'pendiente@test.co' }))).json().ticket_id
    expect((await scan(await qrTokenOf(ticketId))).json()).toMatchObject({ valid: false, reason: 'PendingPayment' })
  })

  it('rechaza un QR repetido', async () => {
    const ticketId = (await purchase(buyer({ email: 'repetido@test.co' }))).json().ticket_id
    await confirm(ticketId)
    const qrToken = await qrTokenOf(ticketId)
    await scan(qrToken)
    expect((await scan(qrToken)).json()).toMatchObject({ valid: false, reason: 'AlreadyUsed' })
  })

  it('el QR solo vale para su fecha: antes no es válido y después vence', async () => {
    const futureId = await insertEvent('Future Night', new Date(Date.now() + 72 * HOUR_MS))
    const pastId = await insertEvent('Past Night', new Date(Date.now() - 48 * HOUR_MS))
    const futureTicket = (await purchase(buyer({ event_id: futureId, email: 'futuro@test.co' }))).json().ticket_id
    const pastTicket = (await purchase(buyer({ event_id: pastId, email: 'pasado@test.co' }))).json().ticket_id
    await confirm(futureTicket)
    await confirm(pastTicket)

    expect((await scan(await qrTokenOf(futureTicket))).json().reason).toBe('NotYetValid')
    expect((await scan(await qrTokenOf(pastTicket))).json().reason).toBe('Expired')
  })

  it('responde inválido para un QR desconocido', async () => {
    expect((await scan('a'.repeat(64))).json()).toMatchObject({ valid: false, reason: 'InvalidQR' })
  })
})

describe('Palcos y mesas', () => {
  const reserve = async (eventId: string, numero: number, email: string) => {
    const spot = await db.one<{ id: string }>(`select id from venue_spots where tipo = 'palco' and numero = $1`, [numero])
    return app.inject({
      method: 'POST',
      url: `/events/${eventId}/ubicaciones/${spot!.id}/reservar`,
      payload: { nombre: 'Titular Palco', email, cedula: '1020304050' },
    })
  }

  it('reserva pendiente, no deja tomar el mismo palco y al confirmar emite un QR por persona', async () => {
    const eventId = await insertEvent('Palco Night', new Date(), { spots: 50 })
    await db.run(`insert into event_spot_offers (event_id, tipo, price_cents, incluye) values ($1, 'palco', 120000000, '{}')`, [eventId])

    const reserved = await reserve(eventId, 2, 'titular@test.co')
    expect(reserved.statusCode).toBe(201)
    expect(reserved.json()).toMatchObject({ status: 'pending_payment', price_cents: 120000000 })
    expect((await reserve(eventId, 2, 'otro@test.co')).json().error).toBe('SpotTaken')

    const map = (await app.inject({ method: 'GET', url: `/events/${eventId}/ubicaciones` })).json()
    expect(map.find((s: { tipo: string; numero: number }) => s.tipo === 'palco' && s.numero === 2).estado).toBe('reservado')

    const confirmed = await app.inject({
      method: 'POST', url: `/admin/pagos/reservas/${reserved.json().reservation_id}/confirmar`, headers: asAdmin(),
    })
    const { capacidad } = (await db.one<{ capacidad: number }>(`select capacidad from venue_spots where tipo = 'palco' and numero = 2`))!
    expect(confirmed.json().tiquetes).toHaveLength(capacidad)
    expect(await spotsLeft(eventId)).toBe(50 - capacidad)
  })
})

describe('GET /tickets/event/:event_id (lista de asistentes del admin)', () => {
  it('protege la ruta y descifra la cédula para el admin', async () => {
    expect((await app.inject({ method: 'GET', url: `/tickets/event/${tonightEventId}` })).statusCode).toBe(401)
    expect((await app.inject({ method: 'GET', url: `/tickets/event/${tonightEventId}`, headers: asPortero() })).statusCode).toBe(403)

    const body = (await app.inject({ method: 'GET', url: `/tickets/event/${tonightEventId}`, headers: asAdmin() })).json()
    expect(body.event_title).toBe('Test Night')
    expect(body.attendees[0].cedula).toMatch(/^\d+$/)
  })

  it('responde 404 para un evento desconocido', async () => {
    const res = await app.inject({ method: 'GET', url: '/tickets/event/nonexistent', headers: asAdmin() })
    expect(res.statusCode).toBe(404)
  })
})

describe('Cupo del evento', () => {
  it('descuenta un cupo por compra y nunca queda negativo', async () => {
    const eventId = await insertEvent('Last Spot Night', new Date(), { spots: 1 })
    expect((await purchase(buyer({ event_id: eventId, email: 'a@test.co' }))).statusCode).toBe(201)
    const soldOut = await purchase(buyer({ event_id: eventId, email: 'b@test.co' }))
    expect(soldOut.json().error).toBe('SoldOut')
    expect(await spotsLeft(eventId)).toBe(0)
  })
})
