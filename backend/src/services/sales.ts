import type { SqlClient } from '../lib/db.js'
import { TRACKED_STOCK_SQL } from './inventory.js'
import { priceMenuLines, totalCentsOf, type MenuLineRequest, type PricedLine } from './menu.js'
import { findActiveTableId } from './tables.js'

export const PAYMENT_METHODS = ['efectivo', 'nequi', 'transferencia'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export interface NewSale {
  meseroId: string
  paymentMethod: PaymentMethod
  items: MenuLineRequest[]
  tableNumber?: number
  notes?: string
}

export interface CreatedSale {
  sale_id: string
  total_cents: number
  item_count: number
}

/**
 * Descuenta inventario con un único UPDATE condicionado (sin leer-luego-escribir):
 * solo toca productos con control de stock y nunca baja de cero.
 */
async function decrementTrackedStock(tx: SqlClient, lines: PricedLine[]): Promise<void> {
  await tx.run(
    `update menu_items
        set stock_qty = greatest(0, stock_qty - sold.quantity), updated_at = now()
       from (select menu_item_id, sum(quantity)::int as quantity
               from jsonb_to_recordset($1::jsonb) as line(menu_item_id uuid, quantity int)
              group by menu_item_id) as sold
      where id = sold.menu_item_id and ${TRACKED_STOCK_SQL}`,
    [JSON.stringify(lines)],
  )
}

async function resolveTableId(tx: SqlClient, tableNumber: number | undefined): Promise<string | null> {
  if (tableNumber === undefined) return null
  return (await findActiveTableId(tx, tableNumber)) ?? null
}

async function insertSale(tx: SqlClient, sale: NewSale, tableId: string | null, totalCents: number): Promise<string> {
  const row = await tx.one<{ id: string }>(
    `insert into sales (mesero_id, table_id, table_number, payment_method, total_cents, notes)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [sale.meseroId, tableId, sale.tableNumber ?? null, sale.paymentMethod, totalCents, sale.notes ?? null],
  )
  return row!.id
}

async function insertSaleItems(tx: SqlClient, saleId: string, lines: PricedLine[]): Promise<void> {
  await tx.run(
    `insert into sale_items (sale_id, menu_item_id, item_name, item_price_cents, quantity, subtotal_cents)
     select $1, line.menu_item_id, line.item_name, line.item_price_cents, line.quantity, line.subtotal_cents
       from jsonb_to_recordset($2::jsonb)
         as line(menu_item_id uuid, item_name text, item_price_cents int, quantity int, subtotal_cents int)`,
    [saleId, JSON.stringify(lines)],
  )
}

/**
 * Única forma de registrar una venta (mesero en barra o pedido de mesa entregado).
 * Es atómica: si `client` ya es una transacción se une a ella.
 */
export function createSale(client: SqlClient, sale: NewSale): Promise<CreatedSale> {
  return client.transaction(async (tx) => {
    const lines = await priceMenuLines(tx, sale.items)
    await decrementTrackedStock(tx, lines)
    const tableId = await resolveTableId(tx, sale.tableNumber)
    const totalCents = totalCentsOf(lines)
    const saleId = await insertSale(tx, sale, tableId, totalCents)
    await insertSaleItems(tx, saleId, lines)
    return { sale_id: saleId, total_cents: totalCents, item_count: lines.length }
  })
}
