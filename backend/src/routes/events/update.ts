import type { FastifyInstance } from 'fastify'
import { parseOrThrow } from '../../lib/schemas.js'
import { isUuid } from '../../lib/ids.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { updateEventSchema } from './eventSchemas.js'
import { readEventBody } from './eventBody.js'
import { updateEvent } from './eventRepository.js'

export async function updateEventRoute(app: FastifyInstance) {
  app.put<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [verifyAuth, requireRole('admin')] },
    async (req, reply) => {
      const fields = parseOrThrow(updateEventSchema, await readEventBody(req))
      if (Object.keys(fields).length === 0) return reply.code(400).send({ error: 'NoFieldsToUpdate' })

      const event = isUuid(req.params.id) ? await updateEvent(req.params.id, fields) : undefined
      if (!event) return reply.code(404).send({ error: 'EventNotFound' })
      return reply.send(event)
    }
  )
}
