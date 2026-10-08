import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import ClienteHome from '../ClienteHome'
import { jsonResponse, renderWithProviders, stubFetchRoutes } from '../../../../tests/utils'

vi.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { nombre: 'Ana', email: 'ana@example.com' } }) }))

const BASE = {
  event_title: 'Maratoneados en Springfield', event_date: '2026-10-11T03:00:00Z', ticket_type: 'general',
  price_cents: 1_000_000, price_stage: 'Etapa 1', qr_used: false, created_at: '2026-10-08T00:00:00Z',
}

describe('ClienteHome', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('muestra el estado de cada tiquete: pendiente con WhatsApp, confirmado con QR y cancelado', async () => {
    stubFetchRoutes({
      'GET /tickets/mine': () => jsonResponse([
        { ...BASE, id: 'p', status: 'pending_payment', qr_data_url: null, whatsapp_url: 'https://wa.me/573001112233' },
        { ...BASE, id: 'c', status: 'confirmed', qr_data_url: 'data:image/png;base64,QR', whatsapp_url: null },
        { ...BASE, id: 'x', status: 'cancelled', qr_data_url: null, whatsapp_url: null },
      ]),
    })
    renderWithProviders(<ClienteHome />)

    expect(await screen.findByText('Pendiente de pago')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pagar por WhatsApp/ })).toHaveAttribute('href', 'https://wa.me/573001112233')
    expect(screen.getByText('Confirmado')).toBeInTheDocument()
    expect(screen.getByText('Cancelado')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Ver QR' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Ver QR' }))
    expect(screen.getByAltText('QR de Maratoneados en Springfield')).toHaveAttribute('src', 'data:image/png;base64,QR')
  })
})
