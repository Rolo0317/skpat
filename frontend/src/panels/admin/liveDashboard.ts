import { api } from '@/lib/api'

/** Contrato de GET /dashboard/live (backend/src/routes/dashboard/live.ts). */
export interface LiveTopItem {
  menu_item_id: string
  item_name: string
  units_sold: number
  revenue_cents: number
}

export interface LiveStockAlert {
  id: string
  name: string
  stock_qty: number
  min_stock: number
}

interface RevenueTotals {
  total_cents: number
  count: number
}

export interface LiveDashboard {
  sales_tonight: RevenueTotals
  tickets_today: RevenueTotals
  attendees_inside: number
  top_items: LiveTopItem[]
  table_orders: { pending: number; attending: number }
  stock_alerts: { count: number; items: LiveStockAlert[] }
}

type LiveDashboardPayload = Partial<LiveDashboard> | null

const EMPTY_TOTALS: RevenueTotals = { total_cents: 0, count: 0 }

/** Completa los campos ausentes para que un cambio parcial del backend no rompa el panel. */
function withDefaults(payload: LiveDashboardPayload): LiveDashboard {
  return {
    sales_tonight: { ...EMPTY_TOTALS, ...payload?.sales_tonight },
    tickets_today: { ...EMPTY_TOTALS, ...payload?.tickets_today },
    attendees_inside: payload?.attendees_inside ?? 0,
    top_items: payload?.top_items ?? [],
    table_orders: { pending: 0, attending: 0, ...payload?.table_orders },
    stock_alerts: { count: 0, items: [], ...payload?.stock_alerts },
  }
}

export function fetchLiveDashboard(): Promise<LiveDashboard> {
  return api.get<LiveDashboardPayload>('/dashboard/live').then(withDefaults)
}
