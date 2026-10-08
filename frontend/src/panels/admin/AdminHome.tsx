import { useState, useEffect } from 'react'
import { RefreshCw, TrendingUp, Ticket, ShoppingCart, AlertTriangle, X } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCOP } from '@/lib/format'
import { LiveTonight } from './LiveTonight'
import { StatTile } from './StatTile'

const SUMMARY_POLL_INTERVAL_MS = 15_000
const NIGHT_START_HOUR = 18
const NIGHT_HOURS_SHOWN = 11
const HOURS_PER_DAY = 24

interface Summary {
  period: string
  sales: { total_cents: number; count: number }
  tickets: { total_cents: number; count: number }
  grand_total_cents: number
  top_items: Array<{ item_name: string; units_sold: number; revenue_cents: number }>
  mesero_breakdown: Array<{ id: string; email: string; nombre: string; sale_count: number; total_cents: number }>
}
interface HourData { hour: string; sales_cents: number; ticket_cents: number; total_cents: number }
interface InvData { alert_count: number; items: Array<{ name: string; stock_qty: number; min_stock: number; is_low_stock: number }> }

/** Las secciones del dashboard son independientes: un fallo deja su bloque vacío sin romper la página. */
function getOrNull<T>(path: string): Promise<T | null> {
  return api.get<T>(path).catch(() => null)
}

export default function AdminHome() {
  const [period, setPeriod] = useState<'tonight' | 'week' | 'month'>('tonight')
  const [filterMesero, setFilterMesero] = useState('')
  const [filterHour, setFilterHour] = useState('')
  const [filterEvent, setFilterEvent] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [hours, setHours] = useState<HourData[]>([])
  const [inv, setInv] = useState<InvData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ period })
    if (filterMesero) params.set('mesero_id', filterMesero)
    if (filterHour) params.set('hour', filterHour)
    if (filterEvent) params.set('event_id', filterEvent)
    const loadSummary = () => getOrNull<Summary>(`/dashboard/summary?${params}`)
    const loadInventory = () => getOrNull<InvData>('/dashboard/inventory')

    Promise.all([loadSummary(), getOrNull<{ hours: HourData[] }>('/dashboard/hours'), loadInventory()])
      .then(([s, hr, iv]) => {
        setSummary(s)
        setHours(hr?.hours ?? [])
        setInv(iv)
      })
      .finally(() => setLoading(false))

    const interval = setInterval(() => {
      loadSummary().then(s => s && setSummary(s))
      loadInventory().then(iv => iv && setInv(iv))
    }, SUMMARY_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [period, filterMesero, filterHour, filterEvent])

  const nightHours = [...Array(NIGHT_HOURS_SHOWN)].map((_, i) => {
    const h = String((NIGHT_START_HOUR + i) % HOURS_PER_DAY).padStart(2, '0')
    return hours.find(hr => hr.hour === h) ?? { hour: h, sales_cents: 0, ticket_cents: 0, total_cents: 0 }
  })
  const maxBar = Math.max(...nightHours.map(h => h.total_cents), 1)
  const hasFilters = filterMesero || filterHour || filterEvent

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-skpat-white">Dashboard</h1>
          <p className="text-xs text-skpat-muted mt-0.5 flex items-center gap-1">
            <RefreshCw size={10} className="animate-spin-slow" />
            Actualización automática cada {SUMMARY_POLL_INTERVAL_MS / 1000}s
          </p>
        </div>
        <div className="flex gap-1 bg-skpat-bg3 border border-skpat-border rounded-lg p-1">
          {(['tonight', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                period === p
                  ? 'bg-skpat-oro text-skpat-bg'
                  : 'text-skpat-muted hover:text-skpat-text'
              }`}
            >
              {p === 'tonight' ? 'Hoy' : p === 'week' ? '7 días' : '30 días'}
            </button>
          ))}
        </div>
      </div>

      <LiveTonight />

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <select
          value={filterMesero}
          onChange={e => setFilterMesero(e.target.value)}
          className="px-3 py-1.5 bg-skpat-bg3 border border-skpat-border rounded-lg text-xs text-skpat-text focus:outline-none focus:border-skpat-oro transition-colors"
        >
          <option value="">Todos los meseros</option>
          {summary?.mesero_breakdown.map(m => (
            <option key={m.id} value={m.id}>{m.nombre || m.email}</option>
          ))}
        </select>
        <select
          value={filterHour}
          onChange={e => setFilterHour(e.target.value)}
          className="px-3 py-1.5 bg-skpat-bg3 border border-skpat-border rounded-lg text-xs text-skpat-text focus:outline-none focus:border-skpat-oro transition-colors"
        >
          <option value="">Todas las horas</option>
          {['18','19','20','21','22','23','00','01','02','03'].map(h => (
            <option key={h} value={h}>{h}:00h</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setFilterMesero(''); setFilterHour(''); setFilterEvent('') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-skpat-red/30 bg-skpat-red/8 text-skpat-red text-xs hover:bg-skpat-red/15 transition-colors"
          >
            <X size={12} />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Inventory alert */}
      {inv && inv.alert_count > 0 && (
        <div className="flex items-center gap-3 bg-skpat-red/8 border border-skpat-red/25 rounded-xl px-4 py-3 mb-5">
          <AlertTriangle size={14} className="text-skpat-red shrink-0" />
          <span className="text-skpat-red text-sm">
            <strong>{inv.alert_count}</strong> producto{inv.alert_count > 1 ? 's' : ''} con stock bajo —{' '}
            {inv.items.filter(i => i.is_low_stock).map(i => i.name).join(', ')}
          </span>
        </div>
      )}

      {loading && !summary && (
        <p className="text-skpat-muted text-sm">Cargando dashboard...</p>
      )}

      {summary && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3.5 mb-5">
            {[
              { label: 'Total general', value: summary.grand_total_cents, color: 'text-skpat-white', sub: `${summary.sales.count + summary.tickets.count} transacciones`, icon: TrendingUp },
              { label: 'Ventas en mesa', value: summary.sales.total_cents, color: 'text-skpat-green', sub: `${summary.sales.count} ventas`, icon: ShoppingCart },
              { label: 'Boletería', value: summary.tickets.total_cents, color: 'text-skpat-oro', sub: `${summary.tickets.count} tiquetes`, icon: Ticket },
            ].map(({ label, value, color, sub, icon }) => (
              <StatTile key={label} label={label} value={formatCOP(value)} sub={sub} icon={icon} colorClass={color} />
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-[1.6fr_1fr] gap-4 mb-4">
            {/* Bar chart */}
            <div className="bg-skpat-card border border-skpat-border rounded-xl p-5">
              <div className="font-bold text-sm text-skpat-white mb-0.5">Ingresos por hora</div>
              <div className="text-xs text-skpat-muted mb-4">Noche actual (6pm – 4am)</div>
              <div className="flex items-end gap-1.5 h-24">
                {nightHours.map(h => (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div
                      className="w-full rounded-t-sm transition-all duration-500 min-h-1"
                      style={{
                        height: `${Math.max(4, (h.total_cents / maxBar) * 100)}%`,
                        background: h.total_cents > 0
                          ? 'linear-gradient(180deg,#d4a63a,#8a6420)'
                          : 'rgba(255,255,255,0.05)',
                      }}
                    />
                    <div className="text-[9px] text-skpat-muted whitespace-nowrap">{h.hour}h</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-skpat-card border border-skpat-border rounded-xl p-5">
              <div className="font-bold text-sm text-skpat-white mb-4">Desglose</div>
              {[
                { label: 'Boletería', value: summary.tickets.total_cents, pct: summary.grand_total_cents > 0 ? (summary.tickets.total_cents / summary.grand_total_cents * 100) : 0, color: 'bg-skpat-oro', textColor: 'text-skpat-oro' },
                { label: 'Ventas mesa', value: summary.sales.total_cents, pct: summary.grand_total_cents > 0 ? (summary.sales.total_cents / summary.grand_total_cents * 100) : 0, color: 'bg-skpat-green', textColor: 'text-skpat-green' },
              ].map(item => (
                <div key={item.label} className="mb-3.5 last:mb-0">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-skpat-muted">{item.label}</span>
                    <span className={`text-xs font-bold ${item.textColor}`}>{item.pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                  <div className={`text-xs font-bold ${item.textColor} mt-1`}>{formatCOP(item.value)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Top items */}
            <div className="bg-skpat-card border border-skpat-border rounded-xl p-5">
              <div className="font-bold text-sm text-skpat-white mb-4">Productos más vendidos</div>
              {summary.top_items.length === 0 ? (
                <p className="text-skpat-muted text-sm">Sin datos</p>
              ) : (
                summary.top_items.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex justify-between items-center mb-2.5 last:mb-0">
                    <div>
                      <div className="text-sm font-semibold text-skpat-text">{item.item_name}</div>
                      <div className="text-xs text-skpat-muted">{item.units_sold} unidades</div>
                    </div>
                    <div className="text-sm font-bold text-skpat-green">{formatCOP(item.revenue_cents)}</div>
                  </div>
                ))
              )}
            </div>

            {/* Mesero breakdown */}
            <div className="bg-skpat-card border border-skpat-border rounded-xl p-5">
              <div className="font-bold text-sm text-skpat-white mb-4">Ventas por mesero</div>
              {summary.mesero_breakdown.length === 0 ? (
                <p className="text-skpat-muted text-sm">Sin meseros</p>
              ) : (() => {
                const maxM = Math.max(...summary.mesero_breakdown.map(m => m.total_cents ?? 0), 1)
                return summary.mesero_breakdown.map(m => (
                  <div key={m.id} className="mb-3 last:mb-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-semibold text-skpat-text">{m.nombre || m.email}</span>
                      <span className="text-xs font-bold text-skpat-green">{formatCOP(m.total_cents ?? 0)}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${((m.total_cents ?? 0) / maxM) * 100}%`,
                          background: 'linear-gradient(90deg,#d4a63a,#f2d38a)',
                        }}
                      />
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
