import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { LiveTonight } from '../LiveTonight'
import { jsonResponse, renderWithProviders, stubFetchRoutes } from '../../../../tests/utils'

describe('LiveTonight', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('muestra las métricas en vivo de la noche', async () => {
    stubFetchRoutes({
      'GET /dashboard/live': () =>
        jsonResponse({
          sales_tonight: { total_cents: 25000000, count: 12 },
          tickets_today: { total_cents: 9000000, count: 3 },
          attendees_inside: 87,
          table_orders: { pending: 2, attending: 1 },
          top_items: [{ menu_item_id: 'm1', item_name: 'Aguardiente', units_sold: 5, revenue_cents: 4000000 }],
          stock_alerts: { count: 1, items: [{ id: 'i1', name: 'Hielo', stock_qty: 1, min_stock: 5 }] },
        }),
    })
    renderWithProviders(<LiveTonight />)

    expect(await screen.findByText('87')).toBeInTheDocument()
    expect(screen.getByText('12 ventas')).toBeInTheDocument()
    expect(screen.getByText('1 en atención')).toBeInTheDocument()
    expect(screen.getByText('Aguardiente')).toBeInTheDocument()
    expect(screen.getByText('Hielo')).toBeInTheDocument()
  })

  it('no rompe la página si el endpoint falla', async () => {
    stubFetchRoutes({ 'GET /dashboard/live': () => jsonResponse({ error: 'Boom' }, 500) })
    renderWithProviders(<LiveTonight />)

    expect(await screen.findByText(/no disponibles/i)).toBeInTheDocument()
  })

  it('tolera respuestas con campos faltantes', async () => {
    stubFetchRoutes({ 'GET /dashboard/live': () => jsonResponse({ attendees_inside: 4 }) })
    renderWithProviders(<LiveTonight />)

    expect(await screen.findByText('4')).toBeInTheDocument()
    expect(screen.getByText('Inventario en orden')).toBeInTheDocument()
  })
})
