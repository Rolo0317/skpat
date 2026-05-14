import type { FastifyInstance } from 'fastify'
import { verifyAuth } from '../../plugins/auth.js'

export async function meRoute(app: FastifyInstance) {
  app.get('/me', { preHandler: verifyAuth }, async (req) => {
    return req.user
  })
}
