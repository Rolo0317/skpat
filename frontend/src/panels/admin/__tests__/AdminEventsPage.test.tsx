import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import AdminEventsPage from '../AdminEventsPage'
import { jsonResponse, renderWithProviders, sentBody, stubFetchRoutes } from '../../../../tests/utils'
import { EVENT_ID, GESTOR, MARATONEADOS, OFERTA } from '../../../../tests/fixtures/operacion'

function stubEvents() {
  return stubFetchRoutes({
    'GET /events': () => jsonResponse([MARATONEADOS]),
    'GET /admin/promoters': () => jsonResponse([GESTOR]),
    [`GET /events/${EVENT_ID}/oferta`]: () => jsonResponse(OFERTA),
    [`PUT /events/${EVENT_ID}/etapas`]: () => jsonResponse(OFERTA),
    [`PUT /events/${EVENT_ID}/ofertas`]: () => jsonResponse(OFERTA),
    'POST /events': () => jsonResponse(MARATONEADOS, 201),
  })
}

describe('AdminEventsPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('edita las etapas y guarda con PUT /events/:id/etapas en el orden mostrado', async () => {
    const fetchMock = stubEvents()
    renderWithProviders(<AdminEventsPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Precios' }))
    const etapas = await screen.findByRole('form', { name: 'Etapas de precio' })
    fireEvent.click(within(etapas).getByRole('button', { name: /Agregar etapa/ }))
    fireEvent.change(within(etapas).getByLabelText('Nombre de la etapa 3'), { target: { value: 'Etapa 3' } })
    fireEvent.change(within(etapas).getByLabelText('Precio en pesos de la etapa 3'), { target: { value: '20000' } })
    fireEvent.click(within(etapas).getByRole('button', { name: 'Subir etapa 3' }))
    fireEvent.click(within(etapas).getByRole('button', { name: 'Guardar etapas' }))

    await waitFor(() =>
      expect(sentBody(fetchMock, 'PUT', `/events/${EVENT_ID}/etapas`)).toEqual([
        { nombre: 'Etapa 1', price_cents: 1_000_000, ends_at: OFERTA.etapas[0]!.ends_at, sort_order: 0 },
        { nombre: 'Etapa 3', price_cents: 2_000_000, ends_at: null, sort_order: 1 },
        { nombre: 'Etapa 2', price_cents: 1_500_000, ends_at: null, sort_order: 2 },
      ]),
    )
  })

  it('agrega un ítem a lo que incluye el palco y guarda las ofertas', async () => {
    const fetchMock = stubEvents()
    renderWithProviders(<AdminEventsPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Precios' }))
    const ofertas = await screen.findByRole('form', { name: 'Ofertas de palco y mesa' })
    fireEvent.change(within(ofertas).getByLabelText('Agregar a lo que incluye Palco VIP'), { target: { value: '2 Four Loko' } })
    fireEvent.click(within(ofertas).getByRole('button', { name: 'Agregar ítem a Palco VIP' }))
    fireEvent.click(within(ofertas).getByRole('button', { name: 'Guardar palco y mesa' }))

    await waitFor(() =>
      expect(sentBody(fetchMock, 'PUT', `/events/${EVENT_ID}/ofertas`)).toEqual([
        { tipo: 'palco', price_cents: 120_000_000, incluye: ['10 entradas', '1 botella', '2 Four Loko'] },
        { tipo: 'mesa', price_cents: 100_000_000, incluye: ['8 entradas'] },
      ]),
    )
  })

  it('crea un evento con fecha de fin y gestor en JSON', async () => {
    const fetchMock = stubEvents()
    renderWithProviders(<AdminEventsPage />)

    fireEvent.click(await screen.findByRole('button', { name: /Nuevo evento/ }))
    await screen.findByRole('option', { name: GESTOR.nombre })
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Guaracha Night' } })
    fireEvent.change(screen.getByLabelText('Empieza'), { target: { value: '2026-10-17T22:00' } })
    fireEvent.change(screen.getByLabelText(/^Termina/), { target: { value: '2026-10-18T08:00' } })
    fireEvent.change(screen.getByLabelText(/^Precio de taquilla/), { target: { value: '20000' } })
    fireEvent.change(screen.getByLabelText('Gestor'), { target: { value: GESTOR.id } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear evento' }))

    await waitFor(() => expect(sentBody(fetchMock, 'POST', '/events')).toMatchObject({
      title: 'Guaracha Night',
      date: new Date('2026-10-17T22:00').toISOString(),
      ends_at: new Date('2026-10-18T08:00').toISOString(),
      price: 2_000_000,
      promoter_id: GESTOR.id,
      image_url: null,
    }))
  })
})
