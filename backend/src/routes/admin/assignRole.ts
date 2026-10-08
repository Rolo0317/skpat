import type { FastifyInstance } from 'fastify'
import { assignRoleSchema, parseOrThrow } from '../../lib/schemas.js'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'

export async function assignRoleRoute(app: FastifyInstance) {
  app.post(
    '/assign-role',
    { preHandler: [verifyAuth, requireRole('admin')] },
    async (req, reply) => {
      const { userId, role } = parseOrThrow(assignRoleSchema, req.body)
      const updated = await db.run('update users set role = $1 where id = $2', [role, userId])
      if (updated === 0) return reply.code(404).send({ error: 'UserNotFound' })
      return reply.send({ ok: true })
    }
  )
}
