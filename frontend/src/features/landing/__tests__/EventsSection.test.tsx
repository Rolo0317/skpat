import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { EventsSection } from '../EventsSection'

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('EventsSection', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('renders heading "Próximos eventos"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }))
    wrap(<EventsSection />)
    expect(screen.getByText('Próximos eventos')).toBeInTheDocument()
  })

  it('renders one EventCard per event returned from /events', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: '1', title: 'Guaracha Night', date: '2026-06-15T22:00:00Z', description: '', price: 3000000, image_url: null, available_spots: 100, is_vip: 0, is_active: 1, created_at: '' },
        { id: '2', title: 'Tech House', date: '2026-06-22T22:00:00Z', description: '', price: 4000000, image_url: null, available_spots: 100, is_vip: 0, is_active: 1, created_at: '' },
      ],
    }))
    wrap(<EventsSection />)
    await waitFor(() => {
      expect(screen.getByText('Guaracha Night')).toBeInTheDocument()
      expect(screen.getByText('Tech House')).toBeInTheDocument()
    })
  })
})
