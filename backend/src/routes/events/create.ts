import type { FastifyInstance } from 'fastify'
import { parseOrThrow } from '../../lib/schemas.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { createEventSchema } from './eventSchemas.js'
import { readEventBody } from './eventBody.js'
import { insertEvent } from './eventRepository.js'

export async function createEventRoute(app: FastifyInstance) {
  app.post(
    '/',
    { preHandler: [verifyAuth, requireRole('admin')] },
    async (req, reply) => {
      const input = parseOrThrow(createEventSchema, await readEventBody(req))
      return reply.code(201).send(await insertEvent(input))
    }
  )
}
