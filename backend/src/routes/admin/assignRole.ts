import type { FastifyInstance } from 'fastify'
import { assignRoleSchema } from '../../lib/schemas.js'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'

export async function assignRoleRoute(app: FastifyInstance) {
  app.post(
    '/assign-role',
    { preHandler: [verifyAuth, requireRole('admin')] },
    async (req, reply) => {
      const parsed = assignRoleSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues })
      }
      const { userId, role } = parsed.data

      const result = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId)
      if (result.changes === 0) {
        return reply.code(404).send({ error: 'UserNotFound' })
      }
      return { ok: true }
    }
  )
}
