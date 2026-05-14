import type { FastifyInstance } from 'fastify'
import { verifyAuth } from '../../plugins/auth.js'
import { decrypt } from '../../lib/encrypt.js'
import { db } from '../../lib/db.js'

type UserRow = {
  id: string
  email: string
  role: string
  nombre: string
  cedula_enc: string | null
  telefono_enc: string | null
  created_at: string
}

export async function profileRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: verifyAuth }, async (req, reply) => {
    const userId = req.user!.id
    const user = db.prepare(
      'SELECT id, email, role, nombre, cedula_enc, telefono_enc, created_at FROM users WHERE id = ?'
    ).get(userId) as UserRow | undefined

    if (!user) {
      return reply.code(404).send({ error: 'ProfileNotFound' })
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      nombre: user.nombre,
      cedula: user.cedula_enc ? decrypt(user.cedula_enc) : null,
      telefono: user.telefono_enc ? decrypt(user.telefono_enc) : null,
      created_at: user.created_at,
    }
  })
}
