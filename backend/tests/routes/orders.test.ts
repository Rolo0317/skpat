import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../../src/app.js'
import { db } from '../../src/lib/db.js'
import { createMenuItem, createUser, resetDb } from '../helpers.js'

const TABLE_NUMBER = 4

let app: FastifyInstance
let meseroToken: string
let meseroId: string
let clienteToken: string
let beerId: string
let rumId: string

// Cada pedido simula un cliente distinto para no chocar con el límite público por IP.
let customerCount = 0
const nextCustomerIp = () => `10.0.0.${++customerCount}`

const placeOrder = (payload: Record<string, unknown>, tableNumber: number | string = TABLE_NUMBER, remoteAddress = nextCustomerIp()) =>
  app.inject({ method: 'POST', url: `/tables/${tableNumber}/orders`, payload, remoteAddress })

const listOrders = (query = '', token = meseroToken) =>
  app.inject({ method: 'GET', url: `/orders${query}`, headers: { authorization: `Bearer ${token}` } })

const updateOrder = (id: string, payload: Record<string, unknown>, token = meseroToken) =>
  app.inject({ method: 'PATCH', url: `/orders/${id}`, headers: { authorization: `Bearer ${token}` }, payload })

const placeBeerOrder = async () => (await placeOrder({ items: [{ menu_item_id: beerId, quantity: 2 }] })).json().id as string

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
  await resetDb()
  const mesero = await createUser('mesero')
  meseroToken = mesero.token
  meseroId = mesero.id
  clienteToken = (await createUser('cliente')).token
  beerId = await createMenuItem({ name: 'Club Colombia', price_cents: 1200000, stock_qty: 20 })
  rumId = await createMenuItem({ name: 'Ron Viejo', category: 'licores', price_cents: 9000000 })
})

afterAll(async () => {
  await resetDb()
  await app.close()
})

describe('POST /tables/:number/orders', () => {
  it('creates a pending order with server-side prices, ignoring client prices', async () => {
    const res = await placeOrder({
      items: [{ menu_item_id: beerId, quantity: 2, price_cents: 1 }, { menu_item_id: rumId }],
      notes: 'Con hielo',
    })
    expect(res.statusCode).toBe(201)
    const order = res.json()
    expect(order).toMatchObject({ table_number: TABLE_NUMBER, status: 'pending', total_cents: 2 * 1200000 + 9000000, notes: 'Con hielo' })
    expect(order.items).toEqual([
      { menu_item_id: beerId, name: 'Club Colombia', price_cents: 1200000, quantity: 2 },
      { menu_item_id: rumId, name: 'Ron Viejo', price_cents: 9000000, quantity: 1 },
    ])
  })

  it('returns 404 TableNotFound for an unknown table', async () => {
    const res = await placeOrder({ items: [{ menu_item_id: beerId }] }, 999)
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('TableNotFound')
  })

  it('returns 400 for a non-numeric table', async () => {
    expect((await placeOrder({ items: [{ menu_item_id: beerId }] }, 'abc')).statusCode).toBe(400)
  })

  it('returns 400 for an empty order', async () => {
    expect((await placeOrder({ items: [] })).statusCode).toBe(400)
  })

  it('returns 404 MenuItemNotFound for an unknown item', async () => {
    const res = await placeOrder({ items: [{ menu_item_id: crypto.randomUUID() }] })
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('MenuItemNotFound')
  })

  it('returns 422 MenuItemInactive for an inactive item', async () => {
    const inactiveId = await createMenuItem({ name: 'Retirado', is_active: false })
    const res = await placeOrder({ items: [{ menu_item_id: inactiveId }] })
    expect(res.json()).toMatchObject({ error: 'MenuItemInactive' })
    expect(res.statusCode).toBe(422)
  })
})

describe('GET /orders', () => {
  it('lists pending orders oldest first for staff', async () => {
    const res = await listOrders('?status=pending')
    expect(res.statusCode).toBe(200)
    const orders = res.json() as Array<{ status: string; table_number: number }>
    expect(orders.length).toBeGreaterThan(0)
    expect(orders.every((order) => order.status === 'pending' && order.table_number === TABLE_NUMBER)).toBe(true)
  })

  it('returns 400 for an unknown status', async () => {
    expect((await listOrders('?status=lost')).statusCode).toBe(400)
  })

  it('returns 403 for clientes', async () => {
    expect((await listOrders('', clienteToken)).statusCode).toBe(403)
  })

  it('returns 401 without auth', async () => {
    expect((await app.inject({ method: 'GET', url: '/orders' })).statusCode).toBe(401)
  })
})

describe('PATCH /orders/:id', () => {
  it('moves an order to attending and assigns the mesero', async () => {
    const orderId = await placeBeerOrder()
    const res = await updateOrder(orderId, { status: 'attending' })
    expect(res.statusCode).toBe(200)
    expect(res.json().order).toMatchObject({ id: orderId, status: 'attending', mesero_id: meseroId })
    expect(res.json().sale).toBeNull()
  })

  it('creates the sale and discounts stock when delivered with a payment method', async () => {
    const orderId = await placeBeerOrder()
    const res = await updateOrder(orderId, { status: 'done', payment_method: 'nequi' })
    expect(res.statusCode).toBe(200)
    const { order, sale } = res.json()
    expect(order.status).toBe('done')
    expect(sale).toMatchObject({ total_cents: 2400000, item_count: 1 })

    const stored = await db.one<{ table_number: number; payment_method: string; mesero_id: string }>(
      'select table_number, payment_method, mesero_id from sales where id = $1', [sale.sale_id],
    )
    expect(stored).toEqual({ table_number: TABLE_NUMBER, payment_method: 'nequi', mesero_id: meseroId })
    const beer = await db.one<{ stock_qty: number }>('select stock_qty from menu_items where id = $1', [beerId])
    expect(beer?.stock_qty).toBe(18)
  })

  it('marks done without a sale when no payment method is given', async () => {
    const orderId = await placeBeerOrder()
    const res = await updateOrder(orderId, { status: 'done' })
    expect(res.statusCode).toBe(200)
    expect(res.json().sale).toBeNull()
  })

  it('returns 409 OrderClosed when changing a finished order', async () => {
    const orderId = await placeBeerOrder()
    await updateOrder(orderId, { status: 'cancelled' })
    const res = await updateOrder(orderId, { status: 'done', payment_method: 'efectivo' })
    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({ error: 'OrderClosed', status: 'cancelled' })
  })

  it('rolls back the status change if the sale fails', async () => {
    const orderId = await placeBeerOrder()
    await db.run('update menu_items set is_active = false where id = $1', [beerId])
    const res = await updateOrder(orderId, { status: 'done', payment_method: 'efectivo' })
    await db.run('update menu_items set is_active = true where id = $1', [beerId])

    expect(res.json()).toMatchObject({ error: 'MenuItemInactive' })
    expect(res.statusCode).toBe(422)
    const order = await db.one<{ status: string }>('select status from table_orders where id = $1', [orderId])
    expect(order?.status).toBe('pending')
  })

  it('returns 400 for a status outside the allowed transitions', async () => {
    const orderId = await placeBeerOrder()
    expect((await updateOrder(orderId, { status: 'pending' })).statusCode).toBe(400)
  })

  it('returns 404 for a non-uuid or unknown id', async () => {
    expect((await updateOrder('nope', { status: 'attending' })).statusCode).toBe(404)
    expect((await updateOrder(crypto.randomUUID(), { status: 'attending' })).json().error).toBe('OrderNotFound')
  })

  it('returns 403 for clientes', async () => {
    const orderId = await placeBeerOrder()
    expect((await updateOrder(orderId, { status: 'attending' }, clienteToken)).statusCode).toBe(403)
  })
})

describe('public order rate limit', () => {
  it('rejects a single customer that floods orders', async () => {
    const floodingIp = '10.9.9.9'
    const ORDERS_OVER_LIMIT = 11
    let lastStatus = 0
    for (let attempt = 0; attempt < ORDERS_OVER_LIMIT; attempt++) {
      lastStatus = (await placeOrder({ items: [{ menu_item_id: rumId }] }, TABLE_NUMBER, floodingIp)).statusCode
    }
    expect(lastStatus).toBe(429)
  })
})
