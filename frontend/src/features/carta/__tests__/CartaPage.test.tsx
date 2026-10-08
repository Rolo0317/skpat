import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import CartaPage from '../CartaPage'
import { jsonResponse, renderWithProviders, sentBody, stubFetchRoutes } from '../../../../tests/utils'

const MENU = [
  { id: 'm1', name: 'Club Colombia', description: null, category: 'cervezas', price_cents: 900000, sort_order: 0 },
  { id: 'm2', name: 'Aguardiente', description: 'Media', category: 'licores', price_cents: 8000000, sort_order: 0 },
]

function renderCarta() {
  return renderWithProviders(<CartaPage />, { path: '/mesa/:table_number', route: '/mesa/7' })
}

describe('CartaPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('arma un pedido con cantidades y lo envía a la mesa', async () => {
    const fetchMock = stubFetchRoutes({
      'GET /menu': () => jsonResponse(MENU),
      'POST /tables/7/orders': () => jsonResponse({ id: 'o1' }, 201),
    })
    renderCarta()

    fireEvent.click(await screen.findByLabelText('Agregar Club Colombia'))
    fireEvent.click(screen.getByLabelText('Agregar Club Colombia'))
    fireEvent.click(screen.getByLabelText('Agregar Aguardiente'))
    fireEvent.click(screen.getByLabelText('Quitar Aguardiente'))
    fireEvent.click(screen.getByLabelText('Agregar Aguardiente'))
    fireEvent.change(screen.getByLabelText('Notas para el mesero'), { target: { value: ' con hielo ' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar pedido/i }))

    expect(await screen.findByTestId('order-sent')).toBeInTheDocument()
    expect(sentBody(fetchMock, 'POST', '/tables/7/orders')).toEqual({
      items: [
        { menu_item_id: 'm1', quantity: 2 },
        { menu_item_id: 'm2', quantity: 1 },
      ],
      notes: 'con hielo',
    })
    expect(screen.queryByTestId('order-cart')).not.toBeInTheDocument()
  })

  it('no muestra el carrito hasta que se agrega un producto', async () => {
    stubFetchRoutes({ 'GET /menu': () => jsonResponse(MENU) })
    renderCarta()

    expect(await screen.findByText('Club Colombia')).toBeInTheDocument()
    expect(screen.queryByTestId('order-cart')).not.toBeInTheDocument()
  })

  it('muestra un error y conserva el carrito si el envío falla', async () => {
    stubFetchRoutes({
      'GET /menu': () => jsonResponse(MENU),
      'POST /tables/7/orders': () => jsonResponse({ error: 'TableNotFound' }, 404),
    })
    renderCarta()

    fireEvent.click(await screen.findByLabelText('Agregar Club Colombia'))
    fireEvent.click(screen.getByRole('button', { name: /enviar pedido/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo enviar/i)
    await waitFor(() => expect(screen.getByTestId('order-cart')).toBeInTheDocument())
  })
})
