import { api } from '@/lib/api'
import type { CartLine } from '@/features/carta/cart'
import type { PaymentMethod } from './paymentMethods'

export type OrderStatus = 'pending' | 'attending' | 'done' | 'cancelled'

export interface TableOrder {
  id: string
  table_number: number
  items: CartLine[]
  total_cents: number
  notes: string | null
  status: OrderStatus
  created_at: string
}

export interface NewTableOrder {
  items: Array<Pick<CartLine, 'menu_item_id' | 'quantity'>>
  notes?: string
}

export interface OrderUpdate {
  status: OrderStatus
  payment_method?: PaymentMethod
}

/** Pedidos que el mesero todavía debe gestionar: recién llegados y en atención. */
const OPEN_STATUSES: readonly OrderStatus[] = ['pending', 'attending']

type OrdersPayload = TableOrder[] | { orders?: TableOrder[] }

function toOrderList(payload: OrdersPayload): TableOrder[] {
  return Array.isArray(payload) ? payload : (payload.orders ?? [])
}

function uniqueById(orders: TableOrder[]): TableOrder[] {
  return [...new Map(orders.map((order) => [order.id, order])).values()]
}

function fetchOrdersByStatus(status: OrderStatus): Promise<TableOrder[]> {
  return api.get<OrdersPayload>(`/orders?status=${status}`).then(toOrderList)
}

export async function fetchOpenOrders(): Promise<TableOrder[]> {
  const ordersByStatus = await Promise.all(OPEN_STATUSES.map(fetchOrdersByStatus))
  return uniqueById(ordersByStatus.flat())
}

export function createTableOrder(tableNumber: string, order: NewTableOrder): Promise<TableOrder> {
  return api.post<TableOrder>(`/tables/${encodeURIComponent(tableNumber)}/orders`, order)
}

export function updateOrder(orderId: string, update: OrderUpdate): Promise<TableOrder> {
  return api.patch<TableOrder>(`/orders/${encodeURIComponent(orderId)}`, update)
}
