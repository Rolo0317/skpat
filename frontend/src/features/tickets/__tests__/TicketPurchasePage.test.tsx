import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TicketPurchasePage from '../TicketPurchasePage'
import { jsonResponse } from '../../../../tests/utils'

const mockEvent = {
  id: 'evt-1',
  title: 'Noche Electronica',
  date: '2026-12-01T22:00:00Z',
  description: 'Best night ever',
  price: 3000000,
  image_url: null,
  available_spots: 50,
  is_vip: 0,
  is_active: 1,
  created_at: '2026-05-01T00:00:00Z',
}

describe('TicketPurchasePage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse([mockEvent])))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders form with event title when event_id matches', async () => {
    render(
      <MemoryRouter initialEntries={['/comprar/evt-1']}>
        <Routes>
          <Route path="/comprar/:event_id" element={<TicketPurchasePage />} />
        </Routes>
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText('Noche Electronica')).toBeDefined()
    })
    expect(screen.getByPlaceholderText(/Juan Carlos/i)).toBeDefined()
    expect(screen.getByPlaceholderText(/tu@email.com/i)).toBeDefined()
  })

  it('shows "Evento no encontrado" when event_id is unknown', async () => {
    render(
      <MemoryRouter initialEntries={['/comprar/unknown-id']}>
        <Routes>
          <Route path="/comprar/:event_id" element={<TicketPurchasePage />} />
        </Routes>
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText(/Evento no encontrado/i)).toBeDefined()
    })
  })
})
