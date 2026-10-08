import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import AdminGalleryPage from '../AdminGalleryPage'
import { callsTo, jsonResponse, renderWithProviders, stubFetchRoutes } from '../../../../../tests/utils'
import { MARATONEADOS } from '../../../../../tests/fixtures/operacion'

const photo = (name: string) => new File(['x'], name, { type: 'image/jpeg' })

describe('AdminGalleryPage', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('arrastra varias fotos, muestra vista previa y las sube una a una con progreso', async () => {
    const fetchMock = stubFetchRoutes({
      'GET /admin/gallery': () => jsonResponse([]),
      'GET /events': () => jsonResponse([MARATONEADOS]),
      'POST /admin/gallery': () => jsonResponse({ id: 'p' }, 201),
    })
    renderWithProviders(<AdminGalleryPage />)

    fireEvent.drop(screen.getByTestId('file-dropzone'), { dataTransfer: { files: [photo('a.jpg'), photo('b.jpg')] } })
    expect(screen.getByAltText('Vista previa de a.jpg')).toBeInTheDocument()
    expect(screen.getByAltText('Vista previa de b.jpg')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Pie de foto de a.jpg'), { target: { value: 'La pista llena' } })

    fireEvent.click(screen.getByRole('button', { name: /Subir 2 fotos/ }))

    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2'))
    const uploads = callsTo(fetchMock, '/admin/gallery').filter(([, init]) => init?.method === 'POST')
    expect(uploads).toHaveLength(2)
    const firstForm = uploads[0]![1]!.body as FormData
    expect(firstForm.get('caption')).toBe('La pista llena')
    expect(firstForm.get('file')).toBeInstanceOf(File)
  })

  it('muestra las fotos existentes con su evento', async () => {
    stubFetchRoutes({
      'GET /admin/gallery': () => jsonResponse([
        { id: 'f1', url: 'https://cdn.example/f1.jpg', caption: 'Noche dorada', event_id: MARATONEADOS.id, event_title: MARATONEADOS.title, created_at: '2026-10-08T00:00:00Z' },
      ]),
      'GET /events': () => jsonResponse([MARATONEADOS]),
    })
    renderWithProviders(<AdminGalleryPage />)

    expect(await screen.findByAltText('Noche dorada')).toHaveAttribute('src', 'https://cdn.example/f1.jpg')
    expect(screen.getByRole('button', { name: 'Borrar esta foto' })).toBeInTheDocument()
  })
})
