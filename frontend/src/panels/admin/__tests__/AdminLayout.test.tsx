import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import AdminLayout from '../AdminLayout'
import { jsonResponse, renderWithProviders, stubFetchRoutes } from '../../../../tests/utils'
import { PENDIENTES } from '../../../../tests/fixtures/operacion'

vi.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ user: { email: 'admin@skpat.co' }, signOut: vi.fn() }) }))

describe('AdminLayout', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('muestra el contador de pagos pendientes en el menú', async () => {
    stubFetchRoutes({ 'GET /admin/pagos/pendientes': () => jsonResponse(PENDIENTES) })
    renderWithProviders(<AdminLayout />)

    expect(await screen.findByLabelText('2 pagos pendientes')).toHaveTextContent('2')
    expect(screen.getByRole('link', { name: /Pagos pendientes/ })).toHaveAttribute('href', '/admin/pagos')
    for (const section of ['Listas', 'Gestores', 'Galería', 'Anuncios', 'Configuración']) {
      expect(screen.getByRole('link', { name: section })).toBeInTheDocument()
    }
  })
})
