import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { PendingOrders } from '../PendingOrders'
import { jsonResponse, renderWithProviders, sentBody, stubFetchRoutes } from '../../../../tests/utils'

const PENDING_ORDER = {
  id: 'o1',
  table_number: 4,
  items: [{ menu_item_id: 'm1', name: 'Club Colombia', price_cents: 900000, quantity: 2 }],
  total_cents: 1800000,
  notes: 'sin vaso',
  status: 'pending',
  created_at: '2026-10-07T03:00:00Z',
}

function stubOrders() {
  return stubFetchRoutes({
    'GET /orders?status=pending': () => jsonResponse([PENDING_ORDER]),
    'GET /orders?status=attending': () => jsonResponse({ orders: [] }),
    'PATCH /orders/o1': () => jsonResponse({ ...PENDING_ORDER, status: 'done' }),
  })
}

describe('PendingOrders', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lista los pedidos abiertos de las mesas', async () => {
    stubOrders()
    renderWithProviders(<PendingOrders />)

    expect(await screen.findByText('Mesa 4')).toBeInTheDocument()
    expect(screen.getByText(/2 × Club Colombia/)).toBeInTheDocument()
    expect(screen.getByText(/sin vaso/)).toBeInTheDocument()
  })

  it('Atender cambia el estado a attending', async () => {
    const fetchMock = stubOrders()
    renderWithProviders(<PendingOrders />)

    fireEvent.click(await screen.findByRole('button', { name: 'Atender' }))

    await waitFor(() => expect(sentBody(fetchMock, 'PATCH', '/orders/o1')).toEqual({ status: 'attending' }))
  })

  it('Entregar y cobrar envía el método de pago elegido', async () => {
    const fetchMock = stubOrders()
    renderWithProviders(<PendingOrders />)

    fireEvent.change(await screen.findByLabelText('Método de pago mesa 4'), { target: { value: 'nequi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entregar y cobrar' }))

    await waitFor(() =>
      expect(sentBody(fetchMock, 'PATCH', '/orders/o1')).toEqual({ status: 'done', payment_method: 'nequi' })
    )
  })

  it('Cancelar marca el pedido como cancelado', async () => {
    const fetchMock = stubOrders()
    renderWithProviders(<PendingOrders />)

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(sentBody(fetchMock, 'PATCH', '/orders/o1')).toEqual({ status: 'cancelled' }))
  })
})
