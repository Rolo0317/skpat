import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'

export async function deleteEventRoute(app: FastifyInstance) {
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [verifyAuth, requireRole('admin')] },
    async (req, reply) => {
      const result = db
        .prepare('UPDATE events SET is_active = 0 WHERE id = ?')
        .run(req.params.id)
      if (result.changes === 0) return reply.code(404).send({ error: 'EventNotFound' })
      return { ok: true }
    }
  )
}
