import { db } from '../lib/db.js'
import { localHourSql } from './businessHours.js'
import { SqlConditions } from './sqlConditions.js'

/** Fuentes de ingreso: ventas en mesa/barra y boletería. Los alias (s, t) son los que usan las condiciones. */
export const REVENUE_SOURCES = {
  sales: { table: 'sales s', amount: 's.total_cents', occurredAt: 's.sold_at' },
  tickets: { table: 'tickets t', amount: 't.price_cents', occurredAt: 't.created_at' },
} as const

export type RevenueSource = keyof typeof REVENUE_SOURCES

export interface RevenueTotals { total_cents: number; count: number }

export interface HourlyRevenue { hour: number; total_cents: number; count: number }

/** Condición base "desde `since`" para una fuente; el llamador puede añadir filtros. */
export function revenueSince(source: RevenueSource, since: Date): SqlConditions {
  return new SqlConditions().add((at) => `${REVENUE_SOURCES[source].occurredAt} >= ${at}`, since)
}

export async function findRevenueTotals(source: RevenueSource, conditions: SqlConditions): Promise<RevenueTotals> {
  const { table, amount } = REVENUE_SOURCES[source]
  const row = await db.one<RevenueTotals>(
    `select coalesce(sum(${amount}), 0) as total_cents, count(*) as count from ${table} ${conditions.toWhere()}`,
    conditions.params,
  )
  return row!
}

export function findRevenueByHour(source: RevenueSource, since: Date): Promise<HourlyRevenue[]> {
  const { table, amount, occurredAt } = REVENUE_SOURCES[source]
  return db.many<HourlyRevenue>(
    `select ${localHourSql(occurredAt)} as hour, coalesce(sum(${amount}), 0) as total_cents, count(*) as count
       from ${table} where ${occurredAt} >= $1
      group by 1`,
    [since],
  )
}

export interface TopSellingItem {
  menu_item_id: string
  item_name: string
  units_sold: number
  revenue_cents: number
}

export function findTopSellingItems(since: Date, limit: number): Promise<TopSellingItem[]> {
  return db.many<TopSellingItem>(
    `select si.menu_item_id, m.name as item_name,
            sum(si.quantity) as units_sold, sum(si.subtotal_cents) as revenue_cents
       from sale_items si
       join sales s on s.id = si.sale_id
       join menu_items m on m.id = si.menu_item_id
      where s.sold_at >= $1
      group by si.menu_item_id, m.name
      order by units_sold desc, revenue_cents desc
      limit $2`,
    [since, limit],
  )
}

export interface MeseroSales {
  mesero_id: string
  email: string
  nombre: string
  sale_count: number
  total_cents: number
  last_sale_at: Date | null
}

/** Ventas por mesero desde `since`, incluyendo a los meseros que aún no venden nada. */
export function findSalesByMesero(since: Date): Promise<MeseroSales[]> {
  return db.many<MeseroSales>(
    `select u.id as mesero_id, u.email, u.nombre,
            count(s.id) as sale_count,
            coalesce(sum(s.total_cents), 0) as total_cents,
            max(s.sold_at) as last_sale_at
       from users u
       left join sales s on s.mesero_id = u.id and s.sold_at >= $1
      where u.role = 'mesero'
      group by u.id
      order by total_cents desc`,
    [since],
  )
}
