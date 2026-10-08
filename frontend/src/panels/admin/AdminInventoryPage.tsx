import { useState, useEffect, useCallback } from 'react'
import { Package, AlertTriangle, RefreshCw, Check, X, Pencil, Infinity } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
interface InventoryItem { id: string; name: string; category: string; stock_qty: number; min_stock: number; is_active: number; is_low_stock: number }
function token() { return localStorage.getItem('skpat_access') ?? '' }

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editVals, setEditVals] = useState({ stock_qty: '', min_stock: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`${API_URL}/inventory`, { headers: { Authorization: `Bearer ${token()}` } })
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (id: string) => {
    setSaving(true)
    await fetch(`${API_URL}/inventory/${id}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({
        stock_qty: editVals.stock_qty !== '' ? parseInt(editVals.stock_qty) : undefined,
        min_stock: editVals.min_stock !== '' ? parseInt(editVals.min_stock) : undefined,
      }),
    })
    setSaving(false)
    setEditing(null)
    load()
  }

  const alertCount = items.filter(i => i.is_low_stock).length
  const categories = [...new Set(items.map(i => i.category))]
  const grouped = items.reduce<Record<string, InventoryItem[]>>((acc, i) => {
    (acc[i.category] ??= []).push(i)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-skpat-white">Inventario</h1>
          <p className="text-xs text-skpat-muted mt-0.5">
            Controla el stock de cada producto. <span className="text-skpat-muted/60">stock = -1 significa ilimitado.</span>
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-skpat-border bg-white/5 text-skpat-muted hover:text-skpat-text text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Alert banner */}
      {alertCount > 0 && (
        <div className="flex items-center gap-3 bg-skpat-red/8 border border-skpat-red/25 rounded-xl px-4 py-3 mb-5">
          <AlertTriangle size={14} className="text-skpat-red shrink-0" />
          <span className="text-skpat-red text-sm font-semibold">
            {alertCount} producto{alertCount > 1 ? 's' : ''} por debajo del stock mínimo
          </span>
        </div>
      )}

      {loading && items.length === 0 && (
        <p className="text-skpat-muted text-sm">Cargando inventario...</p>
      )}

      {/* Category groups */}
      {categories.map(cat => (
        <div key={cat} className="mb-5">
          <div className="flex items-center gap-2 mb-2.5">
            <Package size={11} className="text-skpat-purple" />
            <span className="text-[10px] font-bold text-skpat-purple uppercase tracking-widest">{cat}</span>
          </div>

          <div className="bg-skpat-card border border-skpat-border rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-skpat-bg3">
                  {['Producto', 'Stock actual', 'Mínimo', 'Estado', 'Editar'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-skpat-muted uppercase tracking-widest"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(grouped[cat] ?? []).map(item => (
                  <tr key={item.id} className="border-t border-skpat-border/50 hover:bg-white/[0.02] transition-colors">
                    {/* Name */}
                    <td className="px-4 py-3 text-sm font-semibold text-skpat-text">{item.name}</td>

                    {/* Stock */}
                    <td className="px-4 py-3">
                      {editing === item.id ? (
                        <input
                          type="number"
                          min="-1"
                          value={editVals.stock_qty}
                          onChange={e => setEditVals(s => ({ ...s, stock_qty: e.target.value }))}
                          className="w-20 bg-skpat-bg border border-skpat-purple/40 rounded-md px-2 py-1 text-skpat-text text-sm focus:outline-none focus:border-skpat-purple"
                        />
                      ) : (
                        <span className={`text-base font-bold ${
                          item.stock_qty < 0
                            ? 'text-skpat-muted'
                            : item.is_low_stock
                              ? 'text-skpat-red'
                              : 'text-skpat-green'
                        }`}>
                          {item.stock_qty < 0 ? <Infinity size={16} /> : item.stock_qty}
                        </span>
                      )}
                    </td>

                    {/* Min stock */}
                    <td className="px-4 py-3">
                      {editing === item.id ? (
                        <input
                          type="number"
                          min="0"
                          value={editVals.min_stock}
                          onChange={e => setEditVals(s => ({ ...s, min_stock: e.target.value }))}
                          className="w-16 bg-skpat-bg border border-skpat-purple/40 rounded-md px-2 py-1 text-skpat-text text-sm focus:outline-none focus:border-skpat-purple"
                        />
                      ) : (
                        <span className="text-sm text-skpat-muted">{item.min_stock}</span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      {item.stock_qty < 0 ? (
                        <span className="text-xs text-skpat-muted">Sin seguimiento</span>
                      ) : item.is_low_stock ? (
                        <span className="inline-flex items-center gap-1 bg-skpat-red/12 text-skpat-red border border-skpat-red/25 px-2 py-0.5 rounded-md text-[11px] font-bold">
                          <AlertTriangle size={10} />
                          Stock bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-skpat-green/10 text-skpat-green border border-skpat-green/20 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                          <Check size={10} />
                          OK
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {editing === item.id ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => save(item.id)}
                            disabled={saving}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-skpat-purple text-white text-xs font-semibold disabled:opacity-50 hover:bg-skpat-purple2 transition-colors"
                          >
                            <Check size={11} />
                            {saving ? '...' : 'Guardar'}
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="flex items-center px-2 py-1.5 rounded-md border border-skpat-border text-skpat-muted text-xs hover:text-skpat-text transition-colors"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditing(item.id)
                            setEditVals({
                              stock_qty: item.stock_qty < 0 ? '' : String(item.stock_qty),
                              min_stock: String(item.min_stock),
                            })
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-skpat-border bg-white/5 text-skpat-muted hover:text-skpat-text text-xs transition-colors"
                        >
                          <Pencil size={11} />
                          Editar
                        </button>
                      )}
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
