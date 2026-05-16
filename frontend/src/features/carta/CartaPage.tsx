import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

interface MenuItem {
  id: string
  name: string
  description: string | null
  category: string
  price_cents: number
  sort_order: number
}

function formatCOP(cents: number) {
  return (cents / 100).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

export default function CartaPage() {
  const { table_number } = useParams<{ table_number: string }>()
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/menu`)
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => setError('No se pudo cargar la carta'))
      .finally(() => setLoading(false))
  }, [])

  // Group items by category
  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#09090b',
    color: '#f1f5f9',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: '0 0 40px',
  }

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ background: '#111118', borderBottom: '1px solid rgba(255,255,255,.08)', padding: '18px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: '2px', textTransform: 'uppercase' }}>
              {table_number ? `Mesa ${table_number}` : 'Carta Digital'}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9', marginTop: 2 }}>Skpat VIP</div>
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Tu mesero confirma el pago</div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
        {loading && <p style={{ color: '#64748b', textAlign: 'center', marginTop: 40 }}>Cargando carta...</p>}
        {error && <p style={{ color: '#ef4444', textAlign: 'center', marginTop: 40 }}>{error}</p>}

        {!loading && items.length === 0 && (
          <p style={{ color: '#64748b', textAlign: 'center', marginTop: 40 }}>La carta no est disponible en este momento.</p>
        )}

        {Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category} style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(124,58,237,.2)' }}>
              {category}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {categoryItems.map(item => (
                <div key={item.id} style={{ background: '#18181f', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{item.name}</div>
                    {item.description && (
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{item.description}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#059669', flexShrink: 0 }}>
                    {formatCOP(item.price_cents)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Payment info */}
        {!loading && items.length > 0 && (
          <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 16, textAlign: 'center', marginTop: 8 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Formas de pago aceptadas</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['Efectivo', 'Nequi', 'Transferencia'].map(m => (
                <span key={m} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', padding: '4px 12px', borderRadius: 6, fontSize: 12, color: '#94a3b8' }}>{m}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
