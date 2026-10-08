import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { api, apiAssetUrl, isApiError } from '@/lib/api'
import { formatCOP } from '@/lib/format'
import { TICKET_TYPES, ticketLabel, ticketPriceCents, type TicketType } from '@skpat/backend/src/lib/ticketPrices'

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

const ERROR_MESSAGES: Record<string, string> = {
  AlreadyOnList: 'Ese correo ya está en la lista de este evento. Busca tu QR en tu email o en "Mis entradas".',
  SoldOut: 'No quedan cupos para este evento.',
}

function initialTicketType(requested: string | null): TicketType {
  return TICKET_TYPES.includes(requested as TicketType) ? (requested as TicketType) : 'general'
}

/** Precio legible: la lista se muestra como "Gratis". */
function priceLabel(cents: number): string {
  return cents === 0 ? 'Gratis' : formatCOP(cents)
}

function purchaseErrorMessage(error: unknown): string {
  if (!isApiError(error)) return 'Error de conexión. Intenta de nuevo.'
  if (ERROR_MESSAGES[error.error]) return ERROR_MESSAGES[error.error]!
  if (Array.isArray(error.issues)) return error.issues.map((issue: { message: string }) => issue.message).join(', ')
  return error.error
}

export default function TicketPurchasePage() {
  const { event_id } = useParams<{ event_id: string }>()
  const [searchParams] = useSearchParams()
  const [event, setEvent] = useState<SkpatEvent | null>(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [eventError, setEventError] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [cedula, setCedula] = useState('')
  const [telefono, setTelefono] = useState('')
  const [ticketType, setTicketType] = useState<TicketType>(() => initialTicketType(searchParams.get('tipo')))
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

  const getPrice = () => (event ? ticketPriceCents(ticketType, event.price) : 0)
  const isLista = ticketType === 'lista'

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
      <div style={{ minHeight: '100vh', background: '#0a0806', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#a89f8f' }}>Cargando evento...</p>
      </div>
    )
  }

  if (eventError) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0806', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ color: '#ef4444', fontSize: 18 }}>{eventError}</p>
        <Link to="/" reloadDocument style={{ color: '#d4a63a', textDecoration: 'none' }}>← Volver al inicio</Link>
      </div>
    )
  }

  if (result) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0806', color: '#ece6da', fontFamily: "'Segoe UI',system-ui,sans-serif", padding: '32px 16px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: 24 }}>
            <span style={{ fontSize: 48 }}>🎉</span>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#faf7f0', margin: '12px 0 4px' }}>
              {result.ticket_type === 'lista' ? '¡Estás en la lista!' : '¡Tiquete confirmado!'}
            </h1>
            <p style={{ color: '#a89f8f', fontSize: 14 }}>
              Revisa tu email — el QR fue enviado a <strong style={{ color: '#faf7f0' }}>{email}</strong>
            </p>
          </div>

          <div style={{ background: '#221c14', border: '1px solid #3a3022', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 4px', color: '#faf7f0', fontSize: 18 }}>{result.event_title}</h2>
            <span style={{ background: '#d4a63a', color: '#0a0806', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
              {ticketLabel(result.ticket_type)}
            </span>
            <div style={{ marginTop: 12, color: '#10b981', fontSize: 20, fontWeight: 900 }}>
              {priceLabel(result.price_cents)}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <p style={{ color: '#a89f8f', fontSize: 13, marginBottom: 12 }}>
              Presenta este QR en la entrada:
            </p>
            <img
              src={result.qr_data_url}
              alt="QR Tiquete"
              style={{ width: 220, height: 220, border: '4px solid #3a3022', borderRadius: 12, background: 'white' }}
            />
            <p style={{ color: '#4b5563', fontSize: 11, marginTop: 8, fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {result.qr_token}
            </p>
          </div>

          <div style={{ background: '#1b1711', border: '1px solid #3a3022', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <p style={{ margin: 0, color: '#a89f8f', fontSize: 12, lineHeight: 1.6 }}>
              ⚠️ <strong style={{ color: '#f0c75e' }}>Este QR es personal e intransferible.</strong> Solo puede ser usado una vez en la entrada.
              {result.ticket_type === 'lista' && ' Estar en lista no cuesta: el cover se paga en la puerta según la hora de llegada.'}
            </p>
          </div>

          <Link
            to="/"
            reloadDocument
            style={{ color: '#d4a63a', textDecoration: 'none', fontSize: 14 }}
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0806', color: '#ece6da', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      {/* Navbar simple */}
      <nav style={{ padding: '16px 24px', borderBottom: '1px solid #3a3022', display: 'flex', alignItems: 'center', gap: 16, background: '#0a0806cc', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link to="/" reloadDocument style={{ color: '#d4a63a', textDecoration: 'none', fontSize: 13 }}>← Skpat VIP</Link>
        <span style={{ color: '#4b5563', fontSize: 12 }}>Comprar tiquete</span>
      </nav>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 16px' }}>
        {/* Event info */}
        {event && (
          <div style={{ background: '#221c14', border: '1px solid #3a3022', borderRadius: 16, padding: 20, marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {event.image_url ? (
                <img src={apiAssetUrl(event.image_url)} alt={event.title} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg,#2a1f0e,#3d2c0c)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🎵</div>
              )}
              <div>
                <h2 style={{ margin: '0 0 4px', color: '#faf7f0', fontSize: 20, fontWeight: 800 }}>{event.title}</h2>
                <p style={{ margin: '0 0 8px', color: '#2f80ff', fontSize: 13 }}>
                  📅 {new Date(event.date).toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                {event.description && (
                  <p style={{ margin: 0, color: '#a89f8f', fontSize: 12 }}>{event.description}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#faf7f0', marginBottom: 8 }}>
          {isLista ? 'Anótate en la lista' : 'Comprar Tiquete'}
        </h1>
        <p style={{ color: '#a89f8f', fontSize: 14, marginBottom: 28 }}>
          {isLista
            ? 'Es gratis. Recibirás un QR único a tu nombre por email; el cover se paga en la puerta según la hora de llegada.'
            : 'Completa el formulario y recibirás tu QR único por email.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          {/* Ticket type selector */}
          <div>
            <label style={{ display: 'block', color: '#a89f8f', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Tipo de tiquete
            </label>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
              {TICKET_TYPES.map((type) => {
                const price = event ? ticketPriceCents(type, event.price) : null
                const isSelected = ticketType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTicketType(type)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 10,
                      border: `2px solid ${isSelected ? '#d4a63a' : '#3a3022'}`,
                      background: isSelected ? '#2a1f0e' : '#1b1711',
                      color: isSelected ? '#f2d38a' : '#a89f8f',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all .2s',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{ticketLabel(type)}</div>
                    {price !== null && (
                      <div style={{ fontSize: 12, color: isSelected ? '#10b981' : '#6b7280' }}>{priceLabel(price)}</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Price summary */}
          {event && (
            <div style={{ background: '#1b1711', border: '1px solid #3a3022', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#a89f8f', fontSize: 13 }}>Total a pagar:</span>
              <span style={{ color: '#10b981', fontSize: 20, fontWeight: 900 }}>{priceLabel(getPrice())}</span>
            </div>
          )}

          {/* Personal info */}
          <div>
            <label style={{ display: 'block', color: '#a89f8f', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Nombre completo *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej. Juan Carlos Perez"
              style={{ width: '100%', background: '#1b1711', border: '1px solid #3a3022', borderRadius: 8, padding: '12px 14px', color: '#faf7f0', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#a89f8f', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Correo electrónico *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              style={{ width: '100%', background: '#1b1711', border: '1px solid #3a3022', borderRadius: 8, padding: '12px 14px', color: '#faf7f0', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#a89f8f', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Cédula *</label>
            <input
              type="text"
              inputMode="numeric"
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="1234567890"
              maxLength={15}
              style={{ width: '100%', background: '#1b1711', border: '1px solid #3a3022', borderRadius: 8, padding: '12px 14px', color: '#faf7f0', fontSize: 14, boxSizing: 'border-box' }}
            />
            <p style={{ color: '#4b5563', fontSize: 11, margin: '4px 0 0' }}>Solo dígitos. Se cifra antes de guardar.</p>
          </div>

          <div>
            <label style={{ display: 'block', color: '#a89f8f', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Teléfono (opcional)</label>
            <input
              type="tel"
              inputMode="numeric"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
              placeholder="3001234567"
              maxLength={15}
              style={{ width: '100%', background: '#1b1711', border: '1px solid #3a3022', borderRadius: 8, padding: '12px 14px', color: '#faf7f0', fontSize: 14, boxSizing: 'border-box' }}
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
              background: submitting ? '#3d2c0c' : 'linear-gradient(135deg, #d4a63a, #f2d38a)',
              color: '#0a0806',
              fontSize: 16,
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px #d4a63a40',
              transition: 'all .3s',
            }}
          >
            {submitting ? 'Procesando...' : isLista ? 'Anotarme en la lista' : `Comprar — ${event ? formatCOP(getPrice()) : ''}`}
          </button>

          <p style={{ textAlign: 'center', color: '#4b5563', fontSize: 12 }}>
            Al comprar aceptas que el tiquete es intransferible y válido solo para este evento.
          </p>
        </form>
      </div>
    </div>
  )
}
