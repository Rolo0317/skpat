import { randomUUID } from 'node:crypto'
import type { SqlClient } from '../../lib/db.js'
import { bulkInsert } from './bulkInsert.js'
import { MS_PER_MINUTE, pastWeekendNights } from './bogotaCalendar.js'
import type { Random } from './random.js'
import type { SeededMenuItem } from './seedMenu.js'

/** Marca de las ventas demo: permite saber si ya se sembraron (idempotencia). */
export const DEMO_SALE_NOTE = 'demo-seed'
const PAST_NIGHTS = 8
const SALES_PER_NIGHT = { min: 25, max: 45 }
const LINES_PER_SALE = { min: 1, max: 3 }
const UNITS_PER_LINE = { min: 1, max: 4 }
/** Jornada de 22:00 a 04:00. */
const SHIFT_MINUTES = 6 * 60
const PAYMENT_METHODS = ['efectivo', 'nequi', 'transferencia'] as const

const SALE_COLUMNS = ['id', 'mesero_id', 'table_id', 'table_number', 'payment_method', 'total_cents', 'notes', 'sold_at'] as const
const SALE_ITEM_COLUMNS = ['sale_id', 'menu_item_id', 'item_name', 'item_price_cents', 'quantity', 'subtotal_cents'] as const

interface TableRef {
  id: string
  number: number
}

interface SaleLine {
  sale_id: string
  menu_item_id: string
  item_name: string
  item_price_cents: number
  quantity: number
  subtotal_cents: number
}

export interface SalesContext {
  meseroIds: string[]
  menu: SeededMenuItem[]
  random: Random
  now: Date
}

function buildSaleLines(saleId: string, { menu, random }: SalesContext): SaleLine[] {
  const lineCount = random.int(LINES_PER_SALE.min, LINES_PER_SALE.max)
  return Array.from({ length: lineCount }, () => {
    const item = random.pick(menu)
    const quantity = random.int(UNITS_PER_LINE.min, UNITS_PER_LINE.max)
    return {
      sale_id: saleId, menu_item_id: item.id, item_name: item.name,
      item_price_cents: item.price_cents, quantity, subtotal_cents: item.price_cents * quantity,
    }
  })
}

function buildSale(nightStart: Date, tables: TableRef[], context: SalesContext) {
  const { random, meseroIds } = context
  const id = randomUUID()
  const lines = buildSaleLines(id, context)
  const table = random.pick(tables)
  const sale = {
    id, mesero_id: random.pick(meseroIds), table_id: table.id, table_number: table.number,
    payment_method: random.pick(PAYMENT_METHODS),
    total_cents: lines.reduce((total, line) => total + line.subtotal_cents, 0),
    notes: DEMO_SALE_NOTE,
    sold_at: new Date(nightStart.getTime() + random.int(0, SHIFT_MINUTES - 1) * MS_PER_MINUTE),
  }
  return { sale, lines }
}

const alreadySeeded = async (executor: SqlClient) =>
  Boolean(await executor.one('select 1 from sales where notes = $1 limit 1', [DEMO_SALE_NOTE]))

/** Ventas de los últimos fines de semana, repartidas entre meseros, mesas y la franja 22:00–04:00. */
export async function seedSales(executor: SqlClient, context: SalesContext): Promise<number> {
  if (context.meseroIds.length === 0 || context.menu.length === 0 || (await alreadySeeded(executor))) return 0
  const tables = await executor.many<TableRef>('select id, number from tables where is_active order by number')

  const salesPerNight = () => context.random.int(SALES_PER_NIGHT.min, SALES_PER_NIGHT.max)
  const generated = pastWeekendNights(PAST_NIGHTS, context.now).flatMap((night) =>
    Array.from({ length: salesPerNight() }, () => buildSale(night, tables, context)),
  )
  await executor.transaction(async (tx) => {
    await bulkInsert(tx, 'sales', SALE_COLUMNS, generated.map(({ sale }) => sale))
    await bulkInsert(tx, 'sale_items', SALE_ITEM_COLUMNS, generated.flatMap(({ lines }) => lines))
  })
  return generated.length
}
