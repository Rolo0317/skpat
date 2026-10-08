import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

interface PalcoTier {
  icon: string
  name: string
  desc: string
  price: string
  borderColor: string
  priceColor: string
  popular?: boolean
  ctaGradient?: string
  tier: 'silver' | 'gold' | 'platinum'
}

const TIERS: PalcoTier[] = [
  {
    icon: '🥂',
    name: 'Palco Silver',
    desc: 'Hasta 6 personas · 2 botellas incluidas',
    price: '$450.000',
    borderColor: '#f0c75e',
    priceColor: '#f0c75e',
    tier: 'silver',
  },
  {
    icon: '💎',
    name: 'Palco Gold',
    desc: 'Hasta 10 personas · 4 botellas + servicio',
    price: '$850.000',
    borderColor: '#d4a63a',
    priceColor: '#d4a63a',
    popular: true,
    tier: 'gold',
  },
  {
    icon: '👑',
    name: 'Palco Platinum',
    desc: 'Hasta 15 personas · Abierto + servicio dedicado',
    price: '$1.500.000',
    borderColor: '#f2d38a',
    priceColor: '#f2d38a',
    ctaGradient: 'linear-gradient(135deg, #f2d38a, #d4a63a)',
    tier: 'platinum',
  },
]

export function VipSection() {
  const [showForm, setShowForm] = useState(false)
  const [selectedTier, setSelectedTier] = useState<'silver' | 'gold' | 'platinum'>('gold')
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>([])
  const [formState, setFormState] = useState({ nombre: '', email: '', telefono: '', event_id: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/events`)
      .then(r => r.json())
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  return (
    <section
      id="palcos"
      className="border-y border-skpat-border py-16 px-6"
      style={{ background: 'linear-gradient(135deg, #0f0a1e, #1a0f33)' }}
    >
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-10">
          <div
            className="text-skpat-gold text-xs uppercase font-bold"
            style={{ letterSpacing: '3px' }}
          >
            Experiencia Premium
          </div>
          <h2 className="text-white text-[32px] font-black mt-2">
            Palcos <span className="text-skpat-gold">VIP</span>
          </h2>
          <p className="text-skpat-muted mt-2">
            Reserva tu palco y vive la noche sin límites
          </p>
        </div>
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}
        >
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="bg-skpat-card rounded-2xl p-6 relative"
              style={{ border: `2px solid ${tier.borderColor}` }}
            >
              {tier.popular && (
                <div
                  className="absolute text-white text-[10px] font-bold px-3 py-1 rounded-full"
                  style={{
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #d4a63a, #f2d38a)',
                    letterSpacing: '1px',
                  }}
                >
                  MÁS POPULAR
                </div>
              )}
              <div className="text-[28px] mb-3">{tier.icon}</div>
              <div className="text-white text-lg font-extrabold">{tier.name}</div>
              <div className="text-skpat-muted text-[13px] my-2 mb-4">{tier.desc}</div>
              <div
                className="text-[26px] font-black"
                style={{ color: tier.priceColor }}
              >
                {tier.price}
              </div>
              <button
                onClick={() => { setSelectedTier(tier.tier); setShowForm(true); setSuccess(false); setFormError(null) }}
                className="block text-center w-full mt-4 py-3.5 rounded-full text-skpat-bg font-bold text-[15px] cursor-pointer"
                style={{
                  background:
                    tier.ctaGradient ?? 'linear-gradient(135deg, #d4a63a, #f2d38a)',
                  boxShadow: '0 4px 20px #d4a63a40',
                  border: 'none',
                }}
              >
                Reservar
              </button>
            </div>
          ))}
        </div>

        {showForm && (
          <div style={{ marginTop: 32, background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: 28, maxWidth: 480, margin: '32px auto 0' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 4, color: '#f1f5f9' }}>Reservar Palco {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Completa tus datos y el equipo Skpat te contactará para confirmar.</p>
            {success ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#10b981' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                <p style={{ fontWeight: 700 }}>Reserva enviada con éxito</p>
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Recibirás confirmación en tu email.</p>
                <button onClick={() => { setSuccess(false); setShowForm(false) }} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', color: '#a89f8f', cursor: 'pointer' }}>Cerrar</button>
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault()
                setSubmitting(true); setFormError(null)
                try {
                  const res = await fetch(`${API_URL}/palcos/reserve`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...formState, palco_tier: selectedTier }),
                  })
                  if (!res.ok) { const b = await res.json(); setFormError(b.error ?? 'Error'); return }
                  setSuccess(true)
                } catch { setFormError('Error de conexión') }
                finally { setSubmitting(false) }
              }} style={{ display: 'grid', gap: 14 }}>
                <select value={formState.event_id} onChange={e => setFormState(s => ({ ...s, event_id: e.target.value }))} required
                  style={{ padding: '10px 12px', background: '#111118', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: formState.event_id ? '#f1f5f9' : '#64748b', fontSize: 13 }}>
                  <option value="">Selecciona el evento</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
                {([['nombre', 'Nombre completo', 'text', true], ['email', 'Email de contacto', 'email', true], ['telefono', 'Teléfono (opcional)', 'tel', false]] as const).map(([field, label, type, req]) => (
                  <div key={field}>
                    <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</label>
                    <input type={type} required={req} value={formState[field]}
                      onChange={e => setFormState(s => ({ ...s, [field]: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', background: '#111118', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                ))}
                {formError && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{formError}</p>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" disabled={submitting}
                    style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#b8892a,#e11d48)', color: '#fff', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                    {submitting ? 'Enviando...' : 'Confirmar reserva'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#a89f8f', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
