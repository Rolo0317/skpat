import { useState, useEffect, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
interface MenuItem { id: string; name: string; description: string | null; category: string; price_cents: number; is_active: number; sort_order: number }
function formatCOP(cents: number) { return (cents/100).toLocaleString('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}) }

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', category: 'cervezas', price: '', sort_order: '0' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMenu = useCallback(async () => {
    const res = await fetch(`${API_URL}/menu`)
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadMenu() }, [loadMenu])

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    const token = localStorage.getItem('skpat_access')
    try {
      const res = await fetch(`${API_URL}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: form.name, description: form.description || undefined, category: form.category, price_cents: Math.round(parseFloat(form.price) * 100), sort_order: parseInt(form.sort_order) || 0 }),
      })
      if (!res.ok) { setError((await res.json()).error ?? 'Error'); return }
      setShowForm(false)
      setForm({ name:'', description:'', category:'cervezas', price:'', sort_order:'0' })
      loadMenu()
    } catch { setError('Error de conexión') }
    finally { setSaving(false) }
  }

  const toggleActive = async (item: MenuItem) => {
    const token = localStorage.getItem('skpat_access')
    await fetch(`${API_URL}/menu/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: item.is_active === 0 }),
    })
    loadMenu()
  }

  const categories = ['cervezas', 'licores', 'rones', 'whiskies', 'mezcladores', 'hidratacion', 'combos', 'general']
  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, i) => { (acc[i.category] ??= []).push(i); return acc }, {})

  const cardStyle: React.CSSProperties = { background: '#1c1c2e', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12 }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Carta Digital</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Gestiona los productos disponibles en las mesas</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#e11d48)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          + Agregar producto
        </button>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>Nuevo producto</h3>
          <form onSubmit={createItem} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '1px' }}>Nombre *</label>
              <input required value={form.name} onChange={e => setForm(s => ({...s,name:e.target.value}))} placeholder="Ej. Club Colombia 330ml"
                style={{ width: '100%', background: '#111118', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '1px' }}>Categoria</label>
              <select value={form.category} onChange={e => setForm(s => ({...s,category:e.target.value}))}
                style={{ width: '100%', background: '#111118', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13 }}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '1px' }}>Precio (COP) *</label>
              <input required type="number" min="0" step="100" value={form.price} onChange={e => setForm(s => ({...s,price:e.target.value}))} placeholder="12000"
                style={{ width: '100%', background: '#111118', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '1px' }}>Descripcion</label>
              <input value={form.description} onChange={e => setForm(s => ({...s,description:e.target.value}))} placeholder="Opcional"
                style={{ width: '100%', background: '#111118', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            {error && <p style={{ gridColumn: '1/-1', color: '#f87171', fontSize: 12, margin: 0 }}>{error}</p>}
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving?'not-allowed':'pointer' }}>
                {saving ? 'Guardando...' : 'Crear producto'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <p style={{ color: '#64748b' }}>Cargando carta...</p>}
      {!loading && items.length === 0 && <p style={{ color: '#64748b' }}>No hay productos. Crea el primero.</p>}

      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 10 }}>{cat}</div>
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#111118' }}>
                  {['Producto', 'Precio', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '9px 16px', fontSize: 10, fontWeight: 700, color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catItems.map(item => (
                  <tr key={item.id} style={{ borderTop: '1px solid rgba(255,255,255,.05)', opacity: item.is_active ? 1 : 0.45 }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13 }}>{item.name}</div>
                      {item.description && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.description}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#059669', fontSize: 14 }}>{formatCOP(item.price_cents)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: item.is_active ? 'rgba(5,150,105,.12)' : 'rgba(100,116,139,.12)', color: item.is_active ? '#059669' : '#94a3b8', border: `1px solid ${item.is_active ? 'rgba(5,150,105,.25)' : 'rgba(100,116,139,.2)'}`, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        {item.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => toggleActive(item)}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.06)', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
                        {item.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
