import type { FastifyInstance, FastifyRequest } from 'fastify'
import { HttpError } from '../../lib/db.js'
import { isUuid } from '../../lib/ids.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import {
  cancelReservation, cancelTicket, confirmReservation, confirmTicket, listPendingPayments,
} from '../../services/payments.js'

type IdRequest = FastifyRequest<{ Params: { id: string } }>

function idFrom(req: IdRequest): string {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'NotFound')
  return req.params.id
}

/** Pagos cerrados por WhatsApp: el staff confirma o cancela lo que quedó pendiente. */
export async function paymentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyAuth)
  app.addHook('preHandler', requireRole('admin'))
  const logEmailError = (err: unknown) => app.log.warn({ err }, 'Failed to send ticket email')

  app.get('/pendientes', async () => listPendingPayments())
  app.post('/tiquetes/:id/confirmar', async (req: IdRequest) => confirmTicket(idFrom(req), req.user!.id, logEmailError))
  app.post('/tiquetes/:id/cancelar', async (req: IdRequest) => cancelTicket(idFrom(req)))
  app.post('/reservas/:id/confirmar', async (req: IdRequest) => confirmReservation(idFrom(req), req.user!.id, logEmailError))
  app.post('/reservas/:id/cancelar', async (req: IdRequest) => cancelReservation(idFrom(req)))
}
