import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, BellRing, Radio, ShoppingCart, Ticket, Users } from 'lucide-react'
import { formatCOP } from '@/lib/format'
import { fetchLiveDashboard, type LiveDashboard } from './liveDashboard'
import { StatTile } from './StatTile'

export const LIVE_POLL_INTERVAL_MS = 10_000

function LiveStats({ live }: { live: LiveDashboard }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
      <StatTile label="Ventas de la noche" value={formatCOP(live.sales_tonight.total_cents)} sub={`${live.sales_tonight.count} ventas`} icon={ShoppingCart} colorClass="text-skpat-green" />
      <StatTile label="Tiquetes de hoy" value={String(live.tickets_today.count)} sub={formatCOP(live.tickets_today.total_cents)} icon={Ticket} colorClass="text-skpat-oro" />
      <StatTile label="Asistentes dentro" value={String(live.attendees_inside)} icon={Users} colorClass="text-skpat-azul" />
      <StatTile label="Pedidos pendientes" value={String(live.table_orders.pending)} sub={`${live.table_orders.attending} en atención`} icon={BellRing} colorClass="text-skpat-gold" />
    </div>
  )
}

function LiveTopProducts({ products }: { products: LiveDashboard['top_items'] }) {
  return (
    <div className="bg-skpat-card border border-skpat-border rounded-xl p-5">
      <div className="font-bold text-sm text-skpat-white mb-3">Top productos de la noche</div>
      {products.length === 0 && <p className="text-skpat-muted text-sm">Sin ventas todavía</p>}
      <ol className="space-y-2">
        {products.map((product) => (
          <li key={product.menu_item_id} className="flex justify-between text-sm">
            <span className="text-skpat-text">{product.item_name} <span className="text-skpat-muted text-xs">× {product.units_sold}</span></span>
            <span className="font-bold text-skpat-green">{formatCOP(product.revenue_cents)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function LiveStockAlerts({ alerts }: { alerts: LiveDashboard['stock_alerts']['items'] }) {
  return (
    <div className="bg-skpat-card border border-skpat-border rounded-xl p-5">
      <div className="flex items-center gap-2 font-bold text-sm text-skpat-white mb-3">
        <AlertTriangle size={14} className="text-skpat-red" />
        Alertas de stock
      </div>
      {alerts.length === 0 && <p className="text-skpat-muted text-sm">Inventario en orden</p>}
      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li key={alert.id} className="flex justify-between text-sm">
            <span className="text-skpat-text">{alert.name}</span>
            <span className="text-skpat-red font-semibold">{alert.stock_qty} / mín. {alert.min_stock}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Bloque "En vivo esta noche": si el endpoint falla muestra un aviso y el resto del dashboard sigue. */
export function LiveTonight() {
  const { data: live, isError } = useQuery({
    queryKey: ['dashboard', 'live'],
    queryFn: fetchLiveDashboard,
    refetchInterval: LIVE_POLL_INTERVAL_MS,
    retry: false,
  })

  return (
    <section aria-labelledby="live-tonight-title" data-testid="live-tonight" className="mb-6">
      <h2 id="live-tonight-title" className="flex items-center gap-2 font-bold text-sm text-skpat-white mb-3">
        <Radio size={14} className="text-skpat-champan" />
        En vivo esta noche
      </h2>
      {!live && isError && <p className="text-skpat-muted text-sm">Datos en vivo no disponibles por ahora.</p>}
      {!live && !isError && <p className="text-skpat-muted text-sm">Cargando datos en vivo...</p>}
      {live && (
        <>
          <LiveStats live={live} />
          <div className="grid md:grid-cols-2 gap-4">
            <LiveTopProducts products={live.top_items} />
            <LiveStockAlerts alerts={live.stock_alerts.items} />
          </div>
        </>
      )}
    </section>
  )
}
