import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import AdminListsPage from '../AdminListsPage'
import { jsonResponse, renderWithProviders, sentBody, stubFetchRoutes } from '../../../../../tests/utils'
import { EVENT_ID, GESTOR, LISTA, MARATONEADOS } from '../../../../../tests/fixtures/operacion'

const INSCRITOS = {
  lista: LISTA,
  inscritos: [
    { nombre: 'José Peña', email: 'jose@example.com', cedula: '1010', qr_used: false, created_at: '2026-10-08T00:00:00.000Z' },
    { nombre: 'María Gómez', email: 'maria@example.com', cedula: '2020', qr_used: true, created_at: '2026-10-08T01:00:00.000Z' },
  ],
}

function stubLists() {
  return stubFetchRoutes({
    'GET /admin/lists': () => jsonResponse([LISTA]),
    'POST /admin/lists': () => jsonResponse({ ...LISTA, id: 'l2' }, 201),
    'GET /events': () => jsonResponse([MARATONEADOS]),
    'GET /admin/promoters': () => jsonResponse([GESTOR]),
    'GET /admin/lists/l1/inscritos': () => jsonResponse(INSCRITOS),
  })
}

describe('AdminListsPage', () => {
  const writeText = vi.fn(async () => undefined)
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText } })
    URL.createObjectURL = vi.fn(() => 'blob:csv')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    writeText.mockClear()
  })

  it('muestra cada lista con su gestor, cupo y enlace público para copiar y compartir', async () => {
    stubLists()
    renderWithProviders(<AdminListsPage />)

    expect(await screen.findByText('Lista Simon Correa')).toBeInTheDocument()
    expect(await screen.findByText('Laura Gestora')).toBeInTheDocument()
    expect(screen.getByText('2 de 50 inscritos')).toBeInTheDocument()
    const url = `${window.location.origin}/lista/simon-correa`
    expect(screen.getByText(url)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace de Lista Simon Correa' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(url))
    expect(screen.getByRole('link', { name: /Compartir/ })).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(url)))
  })

  it('crea una lista con cupo; el enlace se genera en el backend', async () => {
    const fetchMock = stubLists()
    renderWithProviders(<AdminListsPage />)

    fireEvent.click(await screen.findByRole('button', { name: /Nueva lista/ }))
    await screen.findAllByRole('option', { name: MARATONEADOS.title })
    fireEvent.change(screen.getByLabelText('Evento'), { target: { value: EVENT_ID } })
    fireEvent.change(screen.getByLabelText('Nombre de la lista'), { target: { value: 'Lista Sabriel' } })
    fireEvent.change(screen.getByLabelText(/^Cupo/), { target: { value: '40' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear lista' }))

    await waitFor(() =>
      expect(sentBody(fetchMock, 'POST', '/admin/lists')).toEqual({
        event_id: EVENT_ID, nombre: 'Lista Sabriel', promoter_id: null, cupo: 40, cierra_at: null, activa: true,
      }),
    )
  })

  it('busca inscritos y exporta CSV', async () => {
    stubLists()
    renderWithProviders(<AdminListsPage />)

    fireEvent.click(await screen.findByRole('button', { name: /Inscritos/ }))
    expect(await screen.findByText('José Peña')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre/), { target: { value: 'maria' } })
    expect(screen.queryByText('José Peña')).not.toBeInTheDocument()
    expect(screen.getByText('María Gómez')).toBeInTheDocument()

    const clickDownload = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }))
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickDownload).toHaveBeenCalledTimes(1)
    clickDownload.mockRestore()
  })
})
