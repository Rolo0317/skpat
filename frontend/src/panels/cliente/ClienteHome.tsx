import { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { Link } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

interface MyTicket {
  id: string
  event_title: string
  event_date: string
  ticket_type: string
  price_cents: number
  status: string
  qr_data_url: string
  qr_token: string
  qr_used: boolean
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  general: 'Entrada General',
  palco_silver: 'Palco Silver',
  palco_gold: 'Palco Gold',
  palco_platinum: 'Palco Platinum',
}

function formatCOP(cents: number) {
  return (cents / 100).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

export default function ClienteHome() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<MyTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openQr, setOpenQr] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('skpat_access')
    if (!token) { setLoading(false); return }
    fetch(`${API_URL}/tickets/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setTickets(Array.isArray(data) ? data : []))
      .catch(() => setError('No se pudieron cargar tus tiquetes'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '24px 32px', maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', margin: '0 0 4px' }}>
          Mis tiquetes
        </h1>
        <p style={{ color: '#64748b', fontSize: 13 }}>
          Hola, {user?.nombre ?? user?.email}. Aquí están tus entradas.
        </p>
      </div>

      {loading && <p style={{ color: '#64748b' }}>Cargando...</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {!loading && tickets.length === 0 && (
        <div style={{ background: '#1c1c2e', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 32, textAlign: 'center' }}>
          <p style={{ color: '#64748b', marginBottom: 16 }}>Aún no tienes tiquetes comprados.</p>
          <Link to="/" style={{ color: '#8b5cf6', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>
            Ver eventos disponibles
          </Link>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tickets.map(ticket => (
          <div key={ticket.id} style={{
            background: '#1c1c2e',
            border: `1px solid ${ticket.qr_used ? 'rgba(100,116,139,.3)' : 'rgba(139,92,246,.25)'}`,
            borderRadius: 14,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: ticket.qr_used ? '#64748b' : '#f1f5f9' }}>
                  {ticket.event_title}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  {new Date(ticket.event_date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(139,92,246,.15)', color: '#a78bfa', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    {TYPE_LABELS[ticket.ticket_type] ?? ticket.ticket_type}
                  </span>
                  <span style={{
                    background: ticket.qr_used ? 'rgba(100,116,139,.15)' : 'rgba(16,185,129,.1)',
                    color: ticket.qr_used ? '#64748b' : '#10b981',
                    border: `1px solid ${ticket.qr_used ? 'rgba(100,116,139,.2)' : 'rgba(16,185,129,.2)'}`,
                    padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  }}>
                    {ticket.qr_used ? 'Utilizado' : 'Válido'}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>
                  {formatCOP(ticket.price_cents)}
                </div>
                {!ticket.qr_used && (
                  <button
                    onClick={() => setOpenQr(openQr === ticket.id ? null : ticket.id)}
                    style={{ marginTop: 8, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(139,92,246,.4)', background: 'rgba(139,92,246,.1)', color: '#a78bfa', fontSize: 12, cursor: 'pointer' }}
                  >
                    {openQr === ticket.id ? 'Ocultar QR' : 'Ver QR'}
                  </button>
                )}
              </div>
            </div>

            {openQr === ticket.id && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '20px', textAlign: 'center', background: '#111118' }}>
                <p style={{ color: '#64748b', fontSize: 12, marginBottom: 12 }}>
                  Presenta este código en la entrada. Es intransferible.
                </p>
                <img
                  src={ticket.qr_data_url}
                  alt="QR Tiquete"
                  style={{ width: 180, height: 180, border: '3px solid rgba(255,255,255,.1)', borderRadius: 10, background: '#fff' }}
                />
                <p style={{ color: '#374151', fontSize: 10, marginTop: 8, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {ticket.qr_token}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
