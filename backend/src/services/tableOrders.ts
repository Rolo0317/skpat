import { db, HttpError, type SqlClient } from '../lib/db.js'
import { isUuid } from '../lib/ids.js'
import { priceMenuLines, totalCentsOf, type MenuLineRequest, type PricedLine } from './menu.js'
import { createSale, type CreatedSale, type PaymentMethod } from './sales.js'
import { findActiveTableId } from './tables.js'

export const ORDER_STATUSES = ['pending', 'attending', 'done', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Estados a los que el personal puede mover un pedido. */
export const ORDER_TRANSITION_TARGETS = ['attending', 'done', 'cancelled'] as const satisfies readonly OrderStatus[]
export type OrderTransitionTarget = (typeof ORDER_TRANSITION_TARGETS)[number]

/** Un pedido sigue abierto (modificable) solo mientras está pendiente o en atención. */
const OPEN_ORDER_SQL = `status in ('pending', 'attending')`

/** Forma guardada en table_orders.items (jsonb). */
export interface OrderItem {
  menu_item_id: string
  name: string
  price_cents: number
  quantity: number
}

export interface TableOrder {
  id: string
  table_number: number
  items: OrderItem[]
  total_cents: number
  notes: string | null
  status: OrderStatus
  mesero_id: string | null
  created_at: Date
}

export interface NewTableOrder {
  tableNumber: number
  items: MenuLineRequest[]
  notes?: string
}

export interface OrderTransition {
  status: OrderTransitionTarget
  staffId: string
  paymentMethod?: PaymentMethod
}

const ORDER_COLUMNS = 'o.id, t.number as table_number, o.items, o.total_cents, o.notes, o.status, o.mesero_id, o.created_at'

const toOrderItem = (line: PricedLine): OrderItem => ({
  menu_item_id: line.menu_item_id,
  name: line.item_name,
  price_cents: line.item_price_cents,
  quantity: line.quantity,
})

async function requireActiveTableId(tableNumber: number): Promise<string> {
  const tableId = await findActiveTableId(db, tableNumber)
  if (!tableId) throw new HttpError(404, 'TableNotFound')
  return tableId
}

/** Pedido público desde el QR de la mesa: los precios y el total los calcula el servidor. */
export async function placeTableOrder(order: NewTableOrder): Promise<TableOrder> {
  const tableId = await requireActiveTableId(order.tableNumber)
  const lines = await priceMenuLines(db, order.items)
  const created = await db.one<TableOrder>(
    `with o as (
       insert into table_orders (table_id, items, total_cents, notes)
       values ($1, $2::jsonb, $3, $4)
       returning *
     )
     select ${ORDER_COLUMNS} from o join tables t on t.id = o.table_id`,
    [tableId, JSON.stringify(lines.map(toOrderItem)), totalCentsOf(lines), order.notes ?? null],
  )
  return created!
}

export function listOrdersByStatus(status: OrderStatus): Promise<TableOrder[]> {
  return db.many<TableOrder>(
    `select ${ORDER_COLUMNS}
       from table_orders o join tables t on t.id = o.table_id
      where o.status = $1
      order by o.created_at`,
    [status],
  )
}

export async function countOpenOrders(): Promise<{ pending: number; attending: number }> {
  const row = await db.one<{ pending: number; attending: number }>(
    `select count(*) filter (where status = 'pending') as pending,
            count(*) filter (where status = 'attending') as attending
       from table_orders where ${OPEN_ORDER_SQL}`,
  )
  return row!
}

/** Cambia el estado solo si el pedido sigue abierto: dos meseros no pueden cerrar el mismo pedido. */
async function moveOpenOrder(tx: SqlClient, orderId: string, transition: OrderTransition): Promise<TableOrder | undefined> {
  return tx.one<TableOrder>(
    `with o as (
       update table_orders set status = $2, mesero_id = $3
        where id = $1 and ${OPEN_ORDER_SQL}
       returning *
     )
     select ${ORDER_COLUMNS} from o join tables t on t.id = o.table_id`,
    [orderId, transition.status, transition.staffId],
  )
}

async function explainRejectedTransition(tx: SqlClient, orderId: string): Promise<HttpError> {
  const existing = await tx.one<{ status: OrderStatus }>('select status from table_orders where id = $1', [orderId])
  return existing ? new HttpError(409, 'OrderClosed', { status: existing.status }) : new HttpError(404, 'OrderNotFound')
}

/** Al entregar un pedido con medio de pago se registra la venta con la misma lógica que usa el mesero. */
function chargeDeliveredOrder(tx: SqlClient, order: TableOrder, transition: OrderTransition): Promise<CreatedSale | null> {
  if (transition.status !== 'done' || !transition.paymentMethod) return Promise.resolve(null)
  return createSale(tx, {
    meseroId: transition.staffId,
    paymentMethod: transition.paymentMethod,
    items: order.items.map(({ menu_item_id, quantity }) => ({ menu_item_id, quantity })),
    tableNumber: order.table_number,
    notes: order.notes ?? undefined,
  })
}

export async function transitionOrder(orderId: string, transition: OrderTransition) {
  if (!isUuid(orderId)) throw new HttpError(404, 'OrderNotFound')
  return db.transaction(async (tx) => {
    const order = await moveOpenOrder(tx, orderId, transition)
    if (!order) throw await explainRejectedTransition(tx, orderId)
    const sale = await chargeDeliveredOrder(tx, order, transition)
    return { order, sale }
  })
}
