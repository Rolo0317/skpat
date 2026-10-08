import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PorteroHome from '../PorteroHome'
import { jsonResponse } from '../../../../tests/utils'

// Mock the QrScannerWidget so jsdom doesn't pull in qr-scanner / worker
vi.mock('../QrScannerWidget', () => ({
  QrScannerWidget: () => <div data-testid="qr-scanner-mock" />,
}))

describe('PorteroHome', () => {
  beforeEach(() => {
    localStorage.setItem('skpat_access', 'test-token')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('renders header, manual mode by default, and three stat boxes at zero', () => {
    render(<PorteroHome />)
    expect(screen.getByText(/Panel Portero/i)).toBeDefined()
    expect(screen.getByTestId('stat-ingresados').textContent).toContain('0')
    expect(screen.getByTestId('stat-rechazados').textContent).toContain('0')
    expect(screen.getByTestId('stat-total').textContent).toContain('0')
  })

  it('shows VALIDO and increments ingresados on a valid scan', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      valid: true,
      nombre: 'Juan Perez',
      ticket_type: 'general',
      event_title: 'Test Night',
    })))
    render(<PorteroHome />)

    const textarea = screen.getByPlaceholderText(/Pega aqui el token/i)
    fireEvent.change(textarea, { target: { value: 'a'.repeat(64) } })
    fireEvent.click(screen.getByText('Validar'))

    await waitFor(() => {
      expect(screen.getByTestId('scan-result').textContent).toContain('VALIDO')
    })
    expect(screen.getByTestId('scan-result').textContent).toContain('Juan Perez')
    expect(screen.getByTestId('stat-ingresados').textContent).toContain('1')
    expect(screen.getByTestId('stat-total').textContent).toContain('1')
  })

  it('shows YA USADO and increments rechazados on AlreadyUsed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      valid: false,
      reason: 'AlreadyUsed',
      message: 'Este QR ya fue escaneado',
      nombre: 'Maria Lopez',
    })))
    render(<PorteroHome />)

    const textarea = screen.getByPlaceholderText(/Pega aqui el token/i)
    fireEvent.change(textarea, { target: { value: 'b'.repeat(64) } })
    fireEvent.click(screen.getByText('Validar'))

    await waitFor(() => {
      expect(screen.getByTestId('scan-result').textContent).toContain('YA USADO')
    })
    expect(screen.getByTestId('stat-rechazados').textContent).toContain('1')
    expect(screen.getByTestId('stat-ingresados').textContent).toContain('0')
  })

  it('rejects empty/short token without calling backend', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    render(<PorteroHome />)

    fireEvent.click(screen.getByText('Validar'))
    expect(screen.getByText(/Token vacio o muy corto/i)).toBeDefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
