import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, apiAssetUrl, isApiError } from '@/lib/api'
import { formatCOP } from '@/lib/format'
import { PALCO_PRICES_CENTS } from '@skpat/backend/src/lib/ticketPrices'

interface SkpatEvent {
  id: string
  title: string
  date: string
  description: string | null
  price: number
  image_url: string | null
  available_spots: number
  is_vip: number
  is_active: number
}

interface PurchaseResult {
  ticket_id: string
  qr_token: string
  qr_data_url: string
  event_title: string
  ticket_type: string
  price_cents: number
}

type TicketType = 'general' | 'palco_silver' | 'palco_gold' | 'palco_platinum'

const TICKET_LABELS: Record<TicketType, string> = {
  general: 'Entrada General',
  palco_silver: 'Palco Silver',
  palco_gold: 'Palco Gold',
  palco_platinum: 'Palco Platinum',
}

// Los precios de palco vienen de la fuente única del backend; la entrada general usa el precio del evento.
const PALCO_PRICES = { general: null, ...PALCO_PRICES_CENTS } as Record<TicketType, number | null>

function purchaseErrorMessage(error: unknown): string {
  if (!isApiError(error)) return 'Error de conexión. Intenta de nuevo.'
  if (Array.isArray(error.issues)) return error.issues.map((issue: { message: string }) => issue.message).join(', ')
  return error.error
}

export default function TicketPurchasePage() {
  const { event_id } = useParams<{ event_id: string }>()
  const [event, setEvent] = useState<SkpatEvent | null>(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [eventError, setEventError] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [cedula, setCedula] = useState('')
  const [telefono, setTelefono] = useState('')
  const [ticketType, setTicketType] = useState<TicketType>('general')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<PurchaseResult | null>(null)

  useEffect(() => {
    if (!event_id) return
    api
      .get<SkpatEvent[]>('/events')
      .then((events) => {
        const ev = events.find((e) => e.id === event_id)
        if (!ev) {
          setEventError('Evento no encontrado')
        } else {
          setEvent(ev)
        }
      })
      .catch(() => setEventError('No se pudo cargar el evento'))
      .finally(() => setLoadingEvent(false))
  }, [event_id])

  const getPrice = () => {
    if (!event) return 0
    if (ticketType === 'general') return event.price
    return PALCO_PRICES[ticketType] ?? event.price
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event_id) return
    setSubmitting(true)
    setFormError(null)

    const cedulaRegex = /^\d{5,15}$/
    if (!cedulaRegex.test(cedula)) {
      setFormError('La cédula debe contener solo dígitos (5–15 caracteres)')
      setSubmitting(false)
      return
    }
    if (telefono && !/^\d{7,15}$/.test(telefono)) {
      setFormError('El teléfono debe contener solo dígitos (7–15 caracteres)')
      setSubmitting(false)
      return
    }

    try {
      const purchase = await api.post<PurchaseResult>('/tickets/purchase', {
        event_id,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        cedula,
        telefono: telefono || undefined,
        ticket_type: ticketType,
      })
      setResult(purchase)
    } catch (error) {
      setFormError(purchaseErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingEvent) {
    return (
      <div style={{ minHeight: '100vh', background: '#07070f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Cargando evento...</p>
      </div>
    )
  }

  if (eventError) {
    return (
      <div style={{ minHeight: '100vh', background: '#07070f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ color: '#ef4444', fontSize: 18 }}>{eventError}</p>
        <Link to="/" reloadDocument style={{ color: '#8b5cf6', textDecoration: 'none' }}>← Volver al inicio</Link>
      </div>
    )
  }

  if (result) {
    return (
      <div style={{ minHeight: '100vh', background: '#07070f', color: '#e2e8f0', fontFamily: "'Segoe UI',system-ui,sans-serif", padding: '32px 16px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: 24 }}>
            <span style={{ fontSize: 48 }}>🎉</span>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f8fafc', margin: '12px 0 4px' }}>
              ¡Tiquete confirmado!
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>
              Revisa tu email — el QR fue enviado a <strong style={{ color: '#f8fafc' }}>{email}</strong>
            </p>
          </div>

          <div style={{ background: '#1a1a30', border: '1px solid #2a2a4a', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 4px', color: '#f8fafc', fontSize: 18 }}>{result.event_title}</h2>
            <span style={{ background: '#8b5cf6', color: 'white', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
              {TICKET_LABELS[result.ticket_type as TicketType] ?? result.ticket_type}
            </span>
            <div style={{ marginTop: 12, color: '#10b981', fontSize: 20, fontWeight: 900 }}>
              {formatCOP(result.price_cents)}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
              Presenta este QR en la entrada:
            </p>
            <img
              src={result.qr_data_url}
              alt="QR Tiquete"
              style={{ width: 220, height: 220, border: '4px solid #2a2a4a', borderRadius: 12, background: 'white' }}
            />
            <p style={{ color: '#4b5563', fontSize: 11, marginTop: 8, fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {result.qr_token}
            </p>
          </div>

          <div style={{ background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, lineHeight: 1.6 }}>
              ⚠️ <strong style={{ color: '#f59e0b' }}>Este tiquete es intransferible.</strong> Solo puede ser usado una vez en la entrada.
            </p>
          </div>

          <Link
            to="/"
            reloadDocument
            style={{ color: '#8b5cf6', textDecoration: 'none', fontSize: 14 }}
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07070f', color: '#e2e8f0', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      {/* Navbar simple */}
      <nav style={{ padding: '16px 24px', borderBottom: '1px solid #2a2a4a', display: 'flex', alignItems: 'center', gap: 16, background: '#07070fcc', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link to="/" reloadDocument style={{ color: '#8b5cf6', textDecoration: 'none', fontSize: 13 }}>← Skpat VIP</Link>
        <span style={{ color: '#4b5563', fontSize: 12 }}>Comprar tiquete</span>
      </nav>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 16px' }}>
        {/* Event info */}
        {event && (
          <div style={{ background: '#1a1a30', border: '1px solid #2a2a4a', borderRadius: 16, padding: 20, marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {event.image_url ? (
                <img src={apiAssetUrl(event.image_url)} alt={event.title} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg,#1a0533,#4c1d95)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🎵</div>
              )}
              <div>
                <h2 style={{ margin: '0 0 4px', color: '#f8fafc', fontSize: 20, fontWeight: 800 }}>{event.title}</h2>
                <p style={{ margin: '0 0 8px', color: '#06b6d4', fontSize: 13 }}>
                  📅 {new Date(event.date).toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                {event.description && (
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>{event.description}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc', marginBottom: 8 }}>
          Comprar Tiquete
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 28 }}>
          Completa el formulario y recibirás tu QR único por email.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          {/* Ticket type selector */}
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Tipo de tiquete
            </label>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
              {(Object.keys(TICKET_LABELS) as TicketType[]).map((type) => {
                const price = type === 'general' && event ? event.price : PALCO_PRICES[type]
                const isSelected = ticketType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTicketType(type)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 10,
                      border: `2px solid ${isSelected ? '#8b5cf6' : '#2a2a4a'}`,
                      background: isSelected ? '#1a0a3a' : '#16162a',
                      color: isSelected ? '#c4b5fd' : '#94a3b8',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all .2s',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{TICKET_LABELS[type]}</div>
                    {price !== null && (
                      <div style={{ fontSize: 12, color: isSelected ? '#10b981' : '#6b7280' }}>{formatCOP(price)}</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Price summary */}
          {event && (
            <div style={{ background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Total a pagar:</span>
              <span style={{ color: '#10b981', fontSize: 20, fontWeight: 900 }}>{formatCOP(getPrice())}</span>
            </div>
          )}

          {/* Personal info */}
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Nombre completo *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej. Juan Carlos Perez"
              style={{ width: '100%', background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '12px 14px', color: '#f8fafc', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Correo electrónico *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              style={{ width: '100%', background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '12px 14px', color: '#f8fafc', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Cédula *</label>
            <input
              type="text"
              inputMode="numeric"
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="1234567890"
              maxLength={15}
              style={{ width: '100%', background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '12px 14px', color: '#f8fafc', fontSize: 14, boxSizing: 'border-box' }}
            />
            <p style={{ color: '#4b5563', fontSize: 11, margin: '4px 0 0' }}>Solo dígitos. Se cifra antes de guardar.</p>
          </div>

          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Teléfono (opcional)</label>
            <input
              type="tel"
              inputMode="numeric"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
              placeholder="3001234567"
              maxLength={15}
              style={{ width: '100%', background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '12px 14px', color: '#f8fafc', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {formError && (
            <div style={{ background: '#1f0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '12px 16px' }}>
              <p style={{ margin: 0, color: '#fca5a5', fontSize: 13 }}>{formError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '16px',
              borderRadius: 50,
              border: 'none',
              background: submitting ? '#4c1d95' : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              color: 'white',
              fontSize: 16,
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px #8b5cf640',
              transition: 'all .3s',
            }}
          >
            {submitting ? 'Procesando...' : `Comprar — ${event ? formatCOP(getPrice()) : ''}`}
          </button>

          <p style={{ textAlign: 'center', color: '#4b5563', fontSize: 12 }}>
            Al comprar aceptas que el tiquete es intransferible y válido solo para este evento.
          </p>
        </form>
      </div>
    </div>
  )
}
