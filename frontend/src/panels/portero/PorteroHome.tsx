import { useState, useCallback, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { QrScannerWidget } from './QrScannerWidget'

type ScanMode = 'camera' | 'manual'

interface ScanResultValid {
  valid: true
  nombre: string
  ticket_type: string
  event_title: string
}
interface ScanResultInvalid {
  valid: false
  reason: 'InvalidQR' | 'AlreadyUsed' | 'TicketNotConfirmed'
  message: string
  nombre?: string
  ticket_type?: string
  event_title?: string
}
type ScanResult = ScanResultValid | ScanResultInvalid

export default function PorteroHome() {
  const [mode, setMode] = useState<ScanMode>('manual')
  const [manualToken, setManualToken] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [stats, setStats] = useState({ ingresados: 0, rechazados: 0, total: 0 })
  const [scannerActive, setScannerActive] = useState(true)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleScan = useCallback(async (token: string) => {
    const trimmed = token.trim()
    if (trimmed.length < 10) {
      setError('Token vacio o muy corto')
      return
    }
    setError(null)
    setSubmitting(true)
    setScannerActive(false)

    try {
      const data = await api.post<ScanResult>('/tickets/scan', { qr_token: trimmed })
      setResult(data)
      setStats((s) => ({
        ingresados: s.ingresados + (data.valid ? 1 : 0),
        rechazados: s.rechazados + (data.valid ? 0 : 1),
        total: s.total + 1,
      }))
      setManualToken('')

      // Auto-reset after 5 seconds
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(() => {
        setResult(null)
        setScannerActive(true)
      }, 5000)
    } catch {
      setError('Error de conexion al backend')
      setScannerActive(true)
    } finally {
      setSubmitting(false)
    }
  }, [])

  useEffect(() => () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
  }, [])

  const resultColor = result?.valid ? '#10b981' : '#ef4444'
  const resultLabel = !result ? '' : result.valid ? 'VALIDO' : (result.reason === 'AlreadyUsed' ? 'YA USADO' : 'INVALIDO')

  return (
    <section style={{ maxWidth: 720, margin: '0 auto', padding: 24, color: '#e2e8f0' }}>
      <header style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Panel Portero</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>Validacion de tiquetes Skpat VIP</p>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setMode('camera')}
          aria-pressed={mode === 'camera'}
          style={{
            flex: 1, padding: 10, borderRadius: 8,
            border: `2px solid ${mode === 'camera' ? '#8b5cf6' : '#2a2a4a'}`,
            background: mode === 'camera' ? '#1a0a3a' : '#16162a',
            color: '#e2e8f0', cursor: 'pointer',
          }}
        >Camara</button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          aria-pressed={mode === 'manual'}
          style={{
            flex: 1, padding: 10, borderRadius: 8,
            border: `2px solid ${mode === 'manual' ? '#8b5cf6' : '#2a2a4a'}`,
            background: mode === 'manual' ? '#1a0a3a' : '#16162a',
            color: '#e2e8f0', cursor: 'pointer',
          }}
        >Pegar token</button>
      </div>

      {mode === 'camera' && (
        <div style={{ marginBottom: 16 }}>
          <QrScannerWidget active={scannerActive} onScan={handleScan} />
        </div>
      )}

      {mode === 'manual' && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>
            QR token (64 caracteres hex)
          </label>
          <textarea
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Pega aqui el token del QR..."
            rows={3}
            style={{
              width: '100%', background: '#16162a', border: '1px solid #2a2a4a',
              borderRadius: 8, padding: 12, color: '#f8fafc', fontFamily: 'monospace',
              fontSize: 12, boxSizing: 'border-box',
            }}
          />
          <button
            type="button"
            onClick={() => handleScan(manualToken)}
            disabled={submitting}
            style={{
              marginTop: 8, padding: '12px 20px', borderRadius: 8,
              border: 'none', background: '#8b5cf6', color: 'white',
              fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Validando...' : 'Validar'}
          </button>
        </div>
      )}

      {error && (
        <div role="alert" style={{ background: '#1f0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#fca5a5', fontSize: 13 }}>{error}</p>
        </div>
      )}

      {result && (
        <div
          role="status"
          data-testid="scan-result"
          style={{
            borderRadius: 12, padding: 24, marginBottom: 16, textAlign: 'center',
            background: result.valid ? '#052e1f' : '#2e0505',
            border: `2px solid ${resultColor}`,
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 900, color: resultColor, marginBottom: 8 }}>
            {resultLabel}
          </div>
          {result.valid && (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>{result.nombre}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                {result.event_title} · {result.ticket_type}
              </div>
            </>
          )}
          {!result.valid && (
            <>
              <div style={{ fontSize: 14, color: '#fca5a5' }}>{result.message}</div>
              {result.nombre && (
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{result.nombre}</div>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div data-testid="stat-ingresados" style={{ background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{stats.ingresados}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Ingresados</div>
        </div>
        <div data-testid="stat-rechazados" style={{ background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444' }}>{stats.rechazados}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Rechazados</div>
        </div>
        <div data-testid="stat-total" style={{ background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc' }}>{stats.total}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Total</div>
        </div>
      </div>
    </section>
  )
}
