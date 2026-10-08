import type { FastifyInstance } from 'fastify'
import { verifyAuth } from '../../plugins/auth.js'
import { decrypt } from '../../lib/encrypt.js'
import { db } from '../../lib/db.js'

interface ProfileRow {
  id: string
  email: string
  role: string
  nombre: string
  cedula_enc: string | null
  telefono_enc: string | null
  created_at: Date
}

const decryptOptional = (ciphertext: string | null) => (ciphertext ? decrypt(ciphertext) : null)

const findProfile = (userId: string) =>
  db.one<ProfileRow>(
    'select id, email, role, nombre, cedula_enc, telefono_enc, created_at from users where id = $1',
    [userId],
  )

export async function profileRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: verifyAuth }, async (req, reply) => {
    const profile = await findProfile(req.user!.id)
    if (!profile) return reply.code(404).send({ error: 'ProfileNotFound' })

    const { cedula_enc, telefono_enc, ...publicFields } = profile
    return reply.send({ ...publicFields, cedula: decryptOptional(cedula_enc), telefono: decryptOptional(telefono_enc) })
  })
}
