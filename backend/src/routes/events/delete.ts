import type { FastifyInstance } from 'fastify'
import { isUuid } from '../../lib/ids.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { deactivateEvent } from './eventRepository.js'

/** Borrado lógico: los tiquetes vendidos siguen apuntando al evento. */
export async function deleteEventRoute(app: FastifyInstance) {
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [verifyAuth, requireRole('admin')] },
    async (req, reply) => {
      const deactivated = isUuid(req.params.id) ? await deactivateEvent(req.params.id) : 0
      if (deactivated === 0) return reply.code(404).send({ error: 'EventNotFound' })
      return reply.send({ ok: true })
    }
  )
}
