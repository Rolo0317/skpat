import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import TicketPurchasePage from '../TicketPurchasePage'
import { jsonResponse, renderWithProviders, sentBody, stubFetchRoutes } from '../../../../tests/utils'
import { EVENT_ID, MARATONEADOS, OFERTA } from '../../../../tests/fixtures/operacion'

const WHATSAPP_URL = 'https://wa.me/573001112233?text=Hola'
const PURCHASE_PATH = '/comprar/:event_id'

function stubPurchase() {
  return stubFetchRoutes({
    'GET /events': () => jsonResponse([MARATONEADOS]),
    [`GET /events/${EVENT_ID}/oferta`]: () => jsonResponse(OFERTA),
    'POST /tickets/purchase': () => jsonResponse({
      ticket_id: 't1', status: 'pending_payment', price_cents: 1_000_000, price_stage: 'Etapa 1',
      event_title: MARATONEADOS.title, whatsapp_url: WHATSAPP_URL,
    }, 201),
  })
}

function renderPurchase(route = `/comprar/${EVENT_ID}`) {
  return renderWithProviders(<TicketPurchasePage />, { path: PURCHASE_PATH, route })
}

describe('TicketPurchasePage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('muestra solo la entrada general al precio vigente, las siguientes etapas y la taquilla', async () => {
    stubPurchase()
    renderPurchase()

    expect(await screen.findByText('Maratoneados en Springfield')).toBeInTheDocument()
    expect(screen.getByTestId('precio-vigente')).toHaveTextContent('10.000')
    expect(screen.getByText('Etapa 2')).toBeInTheDocument()
    expect(screen.getByText('Por confirmar')).toBeInTheDocument()
    expect(screen.queryByText(/Silver|Gold|Platinum/)).not.toBeInTheDocument()
  })

  it('después de comprar muestra "Pendiente de pago" con el botón de WhatsApp', async () => {
    const fetchMock = stubPurchase()
    renderPurchase()

    fireEvent.change(await screen.findByPlaceholderText(/Juan Carlos/), { target: { value: 'Ana Ruiz' } })
    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'ANA@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('1234567890'), { target: { value: '1020304050' } })
    fireEvent.click(screen.getByRole('button', { name: /Apartar entrada/ }))

    expect(await screen.findByRole('heading', { name: 'Pendiente de pago' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Continuar por WhatsApp/ })).toHaveAttribute('href', WHATSAPP_URL)
    expect(screen.getByText(/QR a ANA@example.com/)).toBeInTheDocument()
    expect(sentBody(fetchMock, 'POST', '/tickets/purchase')).toEqual({
      event_id: EVENT_ID, nombre: 'Ana Ruiz', email: 'ana@example.com', cedula: '1020304050',
    })
  })

  it('valida la cédula antes de llamar al backend', async () => {
    const fetchMock = stubPurchase()
    renderPurchase()

    fireEvent.change(await screen.findByPlaceholderText(/Juan Carlos/), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'ana@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('1234567890'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: /Apartar entrada/ }))

    expect(await screen.findByText(/La cédula debe tener solo dígitos/)).toBeInTheDocument()
    expect(sentBody(fetchMock, 'POST', '/tickets/purchase')).toBeUndefined()
  })

  it('muestra "Evento no encontrado" con un id desconocido', async () => {
    stubPurchase()
    renderPurchase('/comprar/desconocido')

    expect(await screen.findByText('Evento no encontrado')).toBeInTheDocument()
  })

  it('?tipo=lista redirige a la sección de entrada de la landing', async () => {
    stubPurchase()
    const replace = vi.fn()
    vi.stubGlobal('location', { ...window.location, replace })
    renderPurchase(`/comprar/${EVENT_ID}?tipo=lista`)

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/#entrada'))
  })
})
