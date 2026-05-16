import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
interface MeseroSales { mesero_id: string; mesero_email: string; sale_count: number; total_cents: number; last_sale_at: number | null }
function formatCOP(cents: number) { return (cents/100).toLocaleString('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}) }

export default function AdminHome() {
  const [meseroData, setMeseroData] = useState<MeseroSales[]>([])
  const [grandTotal, setGrandTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('skpat_access')
    const load = () => fetch(`${API_URL}/sales/tonight`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : { by_mesero: [], grand_total_cents: 0, date: '' })
      .then(data => { setMeseroData(data.by_mesero ?? []); setGrandTotal(data.grand_total_cents ?? 0); setDate(data.date ?? '') })
      .catch(() => {})
      .finally(() => setLoading(false))

    load()
    const interval = setInterval(load, 10000) // poll every 10s
    return () => clearInterval(interval)
  }, [])

  const maxTotal = meseroData.reduce((m, d) => Math.max(m, d.total_cents ?? 0), 1)

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Panel de Administracion</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>{date ? `Ventas del ${date}` : 'Cargando...'}</p>
      </div>

      {/* Grand total */}
      <div style={{ background: '#1c1c2e', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '18px 22px', marginBottom: 22 }}>
        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Total ventas en mesa hoy</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#059669' }}>{formatCOP(grandTotal)}</div>
      </div>

      {/* Mesero comparison */}
      <div style={{ background: '#1c1c2e', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>Ventas por mesero</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Actualizacion cada 10 segundos</div>
        </div>
        {loading && <p style={{ padding: 24, color: '#64748b', textAlign: 'center' }}>Cargando...</p>}
        {!loading && meseroData.length === 0 && <p style={{ padding: 24, color: '#64748b', textAlign: 'center' }}>No hay meseros registrados aun.</p>}
        <div style={{ padding: '12px 0' }}>
          {meseroData.map((m, i) => (
            <div key={m.mesero_id} style={{ padding: '12px 20px', borderTop: i > 0 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{m.mesero_email}</div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{m.sale_count ?? 0} ventas</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>{formatCOP(m.total_cents ?? 0)}</span>
                </div>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${((m.total_cents ?? 0) / maxTotal) * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#e11d48)', borderRadius: 3, transition: 'width .4s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
