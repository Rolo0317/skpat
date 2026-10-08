import { z } from 'zod'
import { db } from '../lib/db.js'

/** stock_qty = -1 significa "sin control de inventario"; solo los productos con stock >= 0 se descuentan y alertan. */
const UNTRACKED_STOCK = -1
export const TRACKED_STOCK_SQL = 'stock_qty >= 0'
export const LOW_STOCK_SQL = `(${TRACKED_STOCK_SQL} and stock_qty <= min_stock)`

export const stockLevelsSchema = z.object({
  stock_qty: z.number().int().min(UNTRACKED_STOCK).optional(),
  min_stock: z.number().int().nonnegative().optional(),
})

export interface StockAlert {
  id: string
  name: string
  category: string
  stock_qty: number
  min_stock: number
}

/** Productos activos en o por debajo de su mínimo, los más críticos primero. */
export function findStockAlerts(): Promise<StockAlert[]> {
  return db.many<StockAlert>(
    `select id, name, category, stock_qty, min_stock
       from menu_items
      where ${LOW_STOCK_SQL} and is_active
      order by (min_stock - stock_qty) desc`,
  )
}
