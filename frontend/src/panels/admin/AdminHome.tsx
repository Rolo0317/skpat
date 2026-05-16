import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
function token() { return localStorage.getItem('skpat_access') ?? '' }
function formatCOP(c: number) { return (c/100).toLocaleString('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}) }

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
    const h = { Authorization: `Bearer ${token()}` }
    setLoading(true)
    const params = new URLSearchParams({ period })
    if (filterMesero) params.set('mesero_id', filterMesero)
    if (filterHour) params.set('hour', filterHour)
    if (filterEvent) params.set('event_id', filterEvent)
    Promise.all([
      fetch(`${API_URL}/dashboard/summary?${params}`, { headers: h }).then(r => r.ok ? r.json() : null),
      fetch(`${API_URL}/dashboard/hours`, { headers: h }).then(r => r.ok ? r.json() : null),
      fetch(`${API_URL}/dashboard/inventory`, { headers: h }).then(r => r.ok ? r.json() : null),
    ]).then(([s, hr, iv]) => {
      setSummary(s)
      setHours(hr?.hours ?? [])
      setInv(iv)
    }).catch(() => {}).finally(() => setLoading(false))

    const interval = setInterval(() => {
      fetch(`${API_URL}/dashboard/summary?${params}`, { headers: h }).then(r => r.ok ? r.json() : null).then(s => s && setSummary(s))
      fetch(`${API_URL}/dashboard/inventory`, { headers: h }).then(r => r.ok ? r.json() : null).then(iv => iv && setInv(iv))
    }, 15000)
    return () => clearInterval(interval)
  }, [period, filterMesero, filterHour, filterEvent])

  // Bar chart: show hours 18-04 (nightclub hours)
  const nightHours = [...Array(11)].map((_, i) => {
    const h = String((18 + i) % 24).padStart(2, '0')
    return hours.find(hr => hr.hour === h) ?? { hour: h, sales_cents: 0, ticket_cents: 0, total_cents: 0 }
  })
  const maxBar = Math.max(...nightHours.map(h => h.total_cents), 1)

  const card: React.CSSProperties = { background: '#1c1c2e', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12 }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Actualización automática cada 15s</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#111118', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 3 }}>
          {(['tonight', 'week', 'month'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: period === p ? '#7c3aed' : 'transparent', color: period === p ? '#fff' : '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all .15s' }}>
              {p === 'tonight' ? 'Hoy' : p === 'week' ? '7 días' : '30 días'}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterMesero} onChange={e => setFilterMesero(e.target.value)}
          style={{ padding: '7px 12px', background: '#18181f', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: filterMesero ? '#f1f5f9' : '#64748b', fontSize: 12 }}>
          <option value="">Todos los meseros</option>
          {summary?.mesero_breakdown.map(m => (
            <option key={m.id} value={m.id}>{m.nombre || m.email}</option>
          ))}
        </select>
        <select value={filterHour} onChange={e => setFilterHour(e.target.value)}
          style={{ padding: '7px 12px', background: '#18181f', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: filterHour ? '#f1f5f9' : '#64748b', fontSize: 12 }}>
          <option value="">Todas las horas</option>
          {['18','19','20','21','22','23','00','01','02','03'].map(h => (
            <option key={h} value={h}>{h}:00h</option>
          ))}
        </select>
        {(filterMesero || filterHour || filterEvent) && (
          <button onClick={() => { setFilterMesero(''); setFilterHour(''); setFilterEvent('') }}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(220,38,38,.3)', background: 'rgba(220,38,38,.08)', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Inventory alerts */}
      {inv && inv.alert_count > 0 && (
        <div style={{ background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.25)', borderRadius: 10, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
          <span style={{ color: '#f87171', fontSize: 13 }}>
            <strong>{inv.alert_count}</strong> producto{inv.alert_count > 1 ? 's' : ''} con stock bajo —{' '}
            {inv.items.filter(i => i.is_low_stock).map(i => i.name).join(', ')}
          </span>
        </div>
      )}

      {loading && !summary && <p style={{ color: '#64748b' }}>Cargando dashboard...</p>}

      {summary && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Total general', value: summary.grand_total_cents, color: '#f1f5f9', sub: `${summary.sales.count + summary.tickets.count} transacciones` },
              { label: 'Ventas en mesa', value: summary.sales.total_cents, color: '#059669', sub: `${summary.sales.count} ventas` },
              { label: 'Boletería', value: summary.tickets.total_cents, color: '#7c3aed', sub: `${summary.tickets.count} tiquetes` },
            ].map(kpi => (
              <div key={kpi.label} style={{ ...card, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{kpi.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color }}>{formatCOP(kpi.value)}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Bar chart */}
            <div style={{ ...card, padding: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', marginBottom: 4 }}>Ingresos por hora</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 18 }}>Noche actual (6pm – 4am)</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
                {nightHours.map(h => (
                  <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: h.total_cents > 0 ? 'linear-gradient(180deg,#7c3aed,#5b21b6)' : 'rgba(255,255,255,.05)', height: `${Math.max(4, (h.total_cents / maxBar) * 100)}%`, transition: 'height .4s ease', minHeight: 4 }} />
                    <div style={{ fontSize: 9, color: '#64748b', whiteSpace: 'nowrap' }}>{h.hour}h</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desglose Boletería vs Mesas */}
            <div style={{ ...card, padding: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', marginBottom: 16 }}>Desglose</div>
              {[
                { label: 'Boletería', value: summary.tickets.total_cents, pct: summary.grand_total_cents > 0 ? (summary.tickets.total_cents / summary.grand_total_cents * 100) : 0, color: '#7c3aed' },
                { label: 'Ventas mesa', value: summary.sales.total_cents, pct: summary.grand_total_cents > 0 ? (summary.sales.total_cents / summary.grand_total_cents * 100) : 0, color: '#059669' },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: 3, transition: 'width .5s ease' }} />
                  </div>
                  <div style={{ fontSize: 12, color: item.color, fontWeight: 700, marginTop: 4 }}>{formatCOP(item.value)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Top items */}
            <div style={{ ...card, padding: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', marginBottom: 16 }}>Productos más vendidos</div>
              {summary.top_items.length === 0 ? <p style={{ color: '#64748b', fontSize: 13 }}>Sin datos</p> : (
                summary.top_items.slice(0, 6).map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
                    <div>
                      <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{item.item_name}</div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>{item.units_sold} unidades</div>
                    </div>
                    <div style={{ color: '#059669', fontWeight: 700 }}>{formatCOP(item.revenue_cents)}</div>
                  </div>
                ))
              )}
            </div>

            {/* Mesero comparison */}
            <div style={{ ...card, padding: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', marginBottom: 16 }}>Ventas por mesero</div>
              {summary.mesero_breakdown.length === 0 ? <p style={{ color: '#64748b', fontSize: 13 }}>Sin meseros</p> : (() => {
                const maxM = Math.max(...summary.mesero_breakdown.map(m => m.total_cents ?? 0), 1)
                return summary.mesero_breakdown.map(m => (
                  <div key={m.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>{m.nombre || m.email}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>{formatCOP(m.total_cents ?? 0)}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${((m.total_cents ?? 0) / maxM) * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#e11d48)', borderRadius: 3 }} />
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
