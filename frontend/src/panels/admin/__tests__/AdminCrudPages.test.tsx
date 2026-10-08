import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import AdminPromotersPage from '../gestores/AdminPromotersPage'
import AdminAnnouncementsPage from '../anuncios/AdminAnnouncementsPage'
import AdminSettingsPage from '../configuracion/AdminSettingsPage'
import { callsTo, jsonResponse, renderWithProviders, sentBody, stubFetchRoutes } from '../../../../tests/utils'
import { GESTOR, MARATONEADOS } from '../../../../tests/fixtures/operacion'

describe('Gestores', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lista gestores con enlace de WhatsApp y crea uno nuevo', async () => {
    const fetchMock = stubFetchRoutes({
      'GET /admin/promoters': () => jsonResponse([GESTOR]),
      'POST /admin/promoters': () => jsonResponse({ ...GESTOR, id: 'g2' }, 201),
    })
    renderWithProviders(<AdminPromotersPage />)

    expect(await screen.findByText('Laura Gestora')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Escribir/ })).toHaveAttribute('href', 'https://wa.me/573001112233')

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Pedro' } })
    fireEvent.change(screen.getByLabelText(/WhatsApp/), { target: { value: '573009998877' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar gestor' }))

    await waitFor(() =>
      expect(sentBody(fetchMock, 'POST', '/admin/promoters')).toEqual({ nombre: 'Pedro', whatsapp: '573009998877', activo: true }),
    )
  })

  it('borrar un gestor exige confirmación', async () => {
    const fetchMock = stubFetchRoutes({
      'GET /admin/promoters': () => jsonResponse([GESTOR]),
      'DELETE /admin/promoters/g1': () => jsonResponse({ ok: true }),
    })
    renderWithProviders(<AdminPromotersPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Borrar al gestor Laura Gestora' }))
    expect(callsTo(fetchMock, '/admin/promoters/g1')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    await waitFor(() => expect(callsTo(fetchMock, '/admin/promoters/g1')).toHaveLength(1))
  })
})

describe('Anuncios', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('publica un anuncio fijado con botón de acción', async () => {
    const fetchMock = stubFetchRoutes({
      'GET /admin/announcements': () => jsonResponse([]),
      'GET /events': () => jsonResponse([MARATONEADOS]),
      'POST /admin/announcements': () => jsonResponse({ id: 'a1' }, 201),
    })
    renderWithProviders(<AdminAnnouncementsPage />)

    fireEvent.click(await screen.findByRole('button', { name: /Nuevo anuncio/ }))
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Etapa 1 a $10.000' } })
    fireEvent.change(screen.getByLabelText('Texto del botón'), { target: { value: 'Compra ya' } })
    fireEvent.change(screen.getByLabelText('Enlace del botón'), { target: { value: '/#entrada' } })
    fireEvent.click(screen.getByLabelText('Fijar arriba'))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar anuncio' }))

    await waitFor(() =>
      expect(sentBody(fetchMock, 'POST', '/admin/announcements')).toEqual({
        titulo: 'Etapa 1 a $10.000', cuerpo: null, image_url: null, cta_label: 'Compra ya', cta_url: '/#entrada',
        event_id: null, ends_at: null, activo: true, fijado: true,
      }),
    )
  })

  it('marca la vigencia de cada anuncio', async () => {
    stubFetchRoutes({
      'GET /admin/announcements': () => jsonResponse([
        { id: 'a1', titulo: 'Vencido', cuerpo: null, image_url: null, cta_label: null, cta_url: null, event_id: null,
          starts_at: '2020-01-01T00:00:00Z', ends_at: '2020-02-01T00:00:00Z', activo: true, fijado: false },
        { id: 'a2', titulo: 'Vigente', cuerpo: null, image_url: null, cta_label: null, cta_url: null, event_id: null,
          starts_at: '2020-01-01T00:00:00Z', ends_at: null, activo: true, fijado: true },
      ]),
      'GET /events': () => jsonResponse([]),
    })
    renderWithProviders(<AdminAnnouncementsPage />)

    expect(await screen.findByText('Visible ahora')).toBeInTheDocument()
    expect(screen.getByText('Vencido', { selector: 'span' })).toBeInTheDocument()
  })
})

describe('Configuración', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('carga los datos del lugar y guarda la dirección', async () => {
    const fetchMock = stubFetchRoutes({
      'GET /settings': () => jsonResponse({ direccion: null, referencia: 'Discoteca sin limite de horario', mapa_url: null, gestores: [] }),
      'PUT /admin/settings': () => jsonResponse({}),
    })
    renderWithProviders(<AdminSettingsPage />)

    expect(await screen.findByDisplayValue('Discoteca sin limite de horario')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/^Dirección/), { target: { value: 'Cra 71D # 6-94 Sur' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(sentBody(fetchMock, 'PUT', '/admin/settings')).toEqual({
        direccion: 'Cra 71D # 6-94 Sur', referencia: 'Discoteca sin limite de horario', mapa_url: null,
      }),
    )
    expect(await screen.findByText('Datos del lugar guardados.')).toBeInTheDocument()
  })
})
