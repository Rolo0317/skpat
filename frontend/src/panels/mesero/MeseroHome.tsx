import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { api, isApiError } from '@/lib/api'
import { formatCOP } from '@/lib/format'
import { groupBy } from '@/lib/collections'
import { useMenu } from '@/features/carta/menu'
import { lineTotal, toOrderItems, useCart } from '@/features/carta/cart'
import { DEFAULT_PAYMENT_METHOD, PAYMENT_METHODS, type PaymentMethod } from '@/features/orders/paymentMethods'
import { PendingOrders } from './PendingOrders'

const SUCCESS_NOTICE_MS = 3_000
const MY_SALES_QUERY_KEY = ['sales', 'mine'] as const

interface Sale {
  id: string; table_number: number | null; payment_method: string
  total_cents: number; notes: string | null
  items_summary: string | null
}
interface MySales { sales: Sale[]; total_tonight_cents: number }

function parseTableNumber(value: string): number | undefined {
  return value ? Number.parseInt(value, 10) : undefined
}

export default function MeseroHome() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'register' | 'sales'>('register')
  const { data: menuItems = [], isLoading: menuLoading } = useMenu()
  const cart = useCart()
  const [tableNumber, setTableNumber] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD)
  const [saleError, setSaleError] = useState<string | null>(null)
  const [saleSuccess, setSaleSuccess] = useState(false)

  const { data: mySales, isLoading: salesLoading } = useQuery({
    queryKey: MY_SALES_QUERY_KEY,
    queryFn: () => api.get<MySales>('/sales/mine'),
  })
  const sales = mySales?.sales ?? []
  const totalTonight = mySales?.total_tonight_cents ?? 0

  const registerSale = useMutation({
    mutationFn: () =>
      api.post('/sales', {
        table_number: parseTableNumber(tableNumber),
        payment_method: paymentMethod,
        items: toOrderItems(cart.lines),
      }),
    onSuccess: () => {
      setSaleSuccess(true)
      cart.clear()
      setTableNumber('')
      setTimeout(() => setSaleSuccess(false), SUCCESS_NOTICE_MS)
      queryClient.invalidateQueries({ queryKey: MY_SALES_QUERY_KEY })
    },
    onError: (error) => setSaleError(isApiError(error) ? error.error : 'Error de conexión'),
  })

  const submitSale = () => {
    if (cart.lines.length === 0) { setSaleError('Agrega al menos un producto'); return }
    setSaleError(null)
    registerSale.mutate()
  }
  const submitting = registerSale.isPending
  const grouped = groupBy(menuItems, (item) => item.category)

  const pageStyle: React.CSSProperties = { minHeight: 'calc(100vh - 64px)', background: '#09090b', color: '#f1f5f9', fontFamily: 'Inter,system-ui,sans-serif' }
  const innerStyle: React.CSSProperties = { maxWidth: 700, margin: '0 auto', padding: '20px 16px' }
  const headerStyle: React.CSSProperties = { background: '#111118', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }
  const tabsStyle: React.CSSProperties = { display: 'flex', gap: 4, background: '#111118', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: 4, marginBottom: 20 }
  const tabStyle = (active: boolean): React.CSSProperties => ({ flex: 1, padding: '8px 16px', borderRadius: 6, border: 'none', background: active ? '#7c3aed' : 'transparent', color: active ? '#fff' : '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .15s' })

  return (
    <div style={pageStyle}>
      <div style={innerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#f1f5f9' }}>{user?.nombre ?? user?.email}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Panel Mesero</div>
          </div>
          <div style={{ background: 'rgba(5,150,105,.08)', border: '1px solid rgba(5,150,105,.2)', padding: '10px 18px', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{formatCOP(totalTonight)}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Mis ventas hoy</div>
          </div>
        </div>

        <PendingOrders />

        {/* Tabs */}
        <div style={tabsStyle}>
          <button style={tabStyle(tab === 'register')} onClick={() => setTab('register')}>Registrar venta</button>
          <button style={tabStyle(tab === 'sales')} onClick={() => setTab('sales')}>Mis ventas</button>
        </div>

        {/* TAB: Register sale */}
        {tab === 'register' && (
          <div>
            {saleSuccess && (
              <div style={{ background: 'rgba(5,150,105,.1)', border: '1px solid rgba(5,150,105,.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#059669', fontWeight: 600 }}>
                Venta registrada correctamente
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '1px' }}>Mesa (opcional)</label>
                <input type="number" min="1" value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="Ej. 7"
                  style={{ width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '1px' }}>Pago</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)}
                  style={{ width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13 }}>
                  {PAYMENT_METHODS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            </div>

            {/* Menu items */}
            {menuLoading ? <p style={{ color: '#64748b' }}>Cargando carta...</p> : (
              Object.entries(grouped).map(([cat, catItems]) => (
                <div key={cat} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>{cat}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {catItems.map(item => (
                      <div key={item.id} style={{ background: '#18181f', border: '1px solid rgba(255,255,255,.07)', borderRadius: 9, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, marginTop: 2 }}>{formatCOP(item.price_cents)}</div>
                        </div>
                        <button onClick={() => cart.add(item)}
                          style={{ width: 28, height: 28, borderRadius: 7, background: '#7c3aed', border: 'none', color: '#fff', fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          +
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* Cart */}
            {cart.lines.length > 0 && (
              <div style={{ background: '#111118', border: '1px solid rgba(124,58,237,.3)', borderRadius: 12, padding: 16, marginTop: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', marginBottom: 12 }}>Pedido actual</div>
                {cart.lines.map(item => (
                  <div key={item.menu_item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: '#cbd5e1' }}>{item.name} x{item.quantity}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: '#059669', fontWeight: 700 }}>{formatCOP(lineTotal(item))}</span>
                      <button onClick={() => cart.remove(item.menu_item_id)}
                        style={{ background: 'rgba(220,38,38,.15)', border: '1px solid rgba(220,38,38,.25)', borderRadius: 5, color: '#f87171', fontSize: 11, padding: '2px 7px', cursor: 'pointer' }}>
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#f1f5f9' }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: '#059669' }}>{formatCOP(cart.total)}</span>
                </div>
                {saleError && <p style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{saleError}</p>}
                <button onClick={submitSale} disabled={submitting}
                  style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 9, border: 'none', background: submitting ? '#4c1d95' : 'linear-gradient(135deg,#7c3aed,#e11d48)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Registrando...' : 'Confirmar venta'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB: Own sales */}
        {tab === 'sales' && (
          <div>
            <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '12px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>Total acumulado hoy</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: '#059669' }}>{formatCOP(totalTonight)}</span>
            </div>
            {salesLoading && <p style={{ color: '#64748b', textAlign: 'center' }}>Cargando...</p>}
            {!salesLoading && sales.length === 0 && <p style={{ color: '#64748b', textAlign: 'center' }}>No hay ventas registradas hoy.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sales.map(sale => (
                <div key={sale.id} style={{ background: '#18181f', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                      {sale.table_number ? `Mesa ${sale.table_number}` : 'Sin mesa'} · {sale.payment_method}
                    </div>
                    {sale.items_summary && <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{sale.items_summary}</div>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#059669', flexShrink: 0 }}>{formatCOP(sale.total_cents)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
