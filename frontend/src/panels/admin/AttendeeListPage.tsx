import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { api, isApiError } from '@/lib/api'
import { formatCOP } from '@/lib/format'
import { ticketLabel } from '@skpat/backend/src/lib/ticketPrices'

const ATTENDEES_POLL_INTERVAL_MS = 5_000
const HTTP_NOT_FOUND = 404

interface Attendee {
  id: string
  nombre: string
  email: string
  cedula: string
  ticket_type: string
  price_cents: number
  status: string
  qr_used: boolean
  qr_used_at: string | null
  created_at: string
}

interface AttendeeData {
  event_id: string
  event_title: string
  total: number
  scanned: number
  attendees: Attendee[]
}

function attendeesErrorMessage(error: unknown): string {
  if (!isApiError(error)) return 'Error de conexión'
  return error.status === HTTP_NOT_FOUND ? 'Evento no encontrado' : 'Error al cargar asistentes'
}

export default function AttendeeListPage() {
  const { event_id } = useParams<{ event_id: string }>()
  const { user } = useAuth()
  const [data, setData] = useState<AttendeeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAttendees = useCallback(async () => {
    if (!event_id) return
    try {
      setData(await api.get<AttendeeData>(`/tickets/event/${event_id}`))
      setError(null)
    } catch (error) {
      setError(attendeesErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [event_id])

  // Initial fetch
  useEffect(() => { fetchAttendees() }, [fetchAttendees])

  useEffect(() => {
    const refetchInterval = setInterval(fetchAttendees, ATTENDEES_POLL_INTERVAL_MS)
    return () => clearInterval(refetchInterval)
  }, [fetchAttendees])

  if (loading) return (
    <div style={{ padding: 32, color: '#a89f8f' }}>Cargando asistentes...</div>
  )
  if (error) return (
    <div style={{ padding: 32 }}>
      <p style={{ color: '#ef4444' }}>{error}</p>
      <Link to="/admin/eventos" style={{ color: '#d4a63a', fontSize: 13 }}>← Volver a eventos</Link>
    </div>
  )
  if (!data) return null

  const pending = data.total - data.scanned

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/admin/eventos" style={{ color: '#d4a63a', fontSize: 13, textDecoration: 'none' }}>
          ← Volver a eventos
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#faf7f0', margin: '10px 0 4px' }}>
          {data.event_title}
        </h1>
        <p style={{ color: '#a89f8f', fontSize: 13 }}>Lista de asistentes · Actualización automática cada 5s</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total tiquetes', value: data.total, color: '#faf7f0' },
          { label: 'Ingresaron', value: data.scanned, color: '#10b981' },
          { label: 'Pendientes', value: pending, color: '#f0c75e' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1c1c2e', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#1c1c2e', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#faf7f0' }}>Asistentes ({data.total})</span>
        </div>
        {data.attendees.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
            Aún no hay asistentes para este evento.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#111118' }}>
                  {['Nombre', 'Email', 'Cédula', 'Tipo', 'Valor', 'Estado', 'Comprado', 'Ingreso'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.attendees.map(a => (
                  <tr key={a.id} style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
                    <td style={{ padding: '12px 16px', color: '#f1f5f9', fontWeight: 600, whiteSpace: 'nowrap' }}>{a.nombre}</td>
                    <td style={{ padding: '12px 16px', color: '#a89f8f', fontSize: 12 }}>{a.email}</td>
                    <td style={{ padding: '12px 16px', color: '#a89f8f', fontFamily: 'monospace', fontSize: 12 }}>{a.cedula}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: 'rgba(212,166,58,.15)', color: '#e6c56e', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        {ticketLabel(a.ticket_type)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatCOP(a.price_cents)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: a.qr_used ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)',
                        color: a.qr_used ? '#10b981' : '#f0c75e',
                        border: `1px solid ${a.qr_used ? 'rgba(16,185,129,.3)' : 'rgba(245,158,11,.3)'}`,
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      }}>
                        {a.qr_used ? 'Ingresó' : 'Pendiente'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {new Date(a.created_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {a.qr_used_at ? new Date(a.qr_used_at).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
