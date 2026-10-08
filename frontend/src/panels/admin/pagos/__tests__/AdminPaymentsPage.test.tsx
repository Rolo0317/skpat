import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import AdminPaymentsPage from '../AdminPaymentsPage'
import { callsTo, jsonResponse, renderWithProviders, stubFetchRoutes } from '../../../../../tests/utils'
import { PENDIENTES } from '../../../../../tests/fixtures/operacion'

const QR = 'data:image/png;base64,AAA'

function stubPayments() {
  return stubFetchRoutes({
    'GET /admin/pagos/pendientes': () => jsonResponse(PENDIENTES),
    'POST /admin/pagos/reservas/r1/confirmar': () =>
      jsonResponse({ reservation_id: 'r1', status: 'confirmed', tiquetes: [{ ticket_id: 'a', qr_data_url: QR }, { ticket_id: 'b', qr_data_url: QR }] }),
    'POST /admin/pagos/tiquetes/t1/cancelar': () => jsonResponse({ ticket_id: 't1', status: 'cancelled' }),
    'POST /admin/pagos/tiquetes/t1/confirmar': () => jsonResponse({ error: 'AlreadyProcessed' }, 409),
  })
}

describe('AdminPaymentsPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lista tiquetes y reservas pendientes con monto, detalle y WhatsApp del cliente', async () => {
    stubPayments()
    renderWithProviders(<AdminPaymentsPage />)

    expect(await screen.findByText('Carlos Díaz')).toBeInTheDocument()
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument()
    expect(screen.getByText('Palco VIP 3 · 2 personas')).toBeInTheDocument()
    expect(screen.getByText('Entrada General · Etapa 1')).toBeInTheDocument()
    expect(screen.getByText(/2 por confirmar/)).toBeInTheDocument()
    const whatsapp = screen.getByRole('link', { name: /WhatsApp/ })
    expect(whatsapp).toHaveAttribute('href', expect.stringContaining('https://wa.me/573004445566?text='))
  })

  it('confirmar una reserva pide confirmación y luego muestra los QR para descargar', async () => {
    const fetchMock = stubPayments()
    renderWithProviders(<AdminPaymentsPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar pago de Carlos Díaz' }))
    const dialog = screen.getByRole('dialog', { name: '¿Confirmar pago?' })
    expect(callsTo(fetchMock, '/admin/pagos/reservas/r1/confirmar')).toHaveLength(0)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, el pago llegó' }))

    const qrDialog = await screen.findByRole('dialog', { name: 'QR generados para Carlos Díaz' })
    expect(within(qrDialog).getAllByRole('img')).toHaveLength(2)
    expect(within(qrDialog).getByRole('button', { name: /Descargar todos/ })).toBeInTheDocument()
  })

  it('cancelar un tiquete envía la cancelación tras confirmar en el modal', async () => {
    const fetchMock = stubPayments()
    renderWithProviders(<AdminPaymentsPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar solicitud de Ana Ruiz' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }))

    await waitFor(() => expect(callsTo(fetchMock, '/admin/pagos/tiquetes/t1/cancelar')).toHaveLength(1))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('explica cuando otro miembro del equipo ya procesó el pago', async () => {
    stubPayments()
    renderWithProviders(<AdminPaymentsPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar pago de Ana Ruiz' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, el pago llegó' }))

    expect(await screen.findByText('Otro miembro del equipo ya procesó este pago.')).toBeInTheDocument()
  })
})
