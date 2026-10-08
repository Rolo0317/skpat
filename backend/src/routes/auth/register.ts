import type { FastifyInstance } from 'fastify'
import { parseOrThrow, registerSchema, type RegisterInput } from '../../lib/schemas.js'
import { encrypt } from '../../lib/encrypt.js'
import { hashSecret } from '../../lib/argon2.js'
import { db, HttpError } from '../../lib/db.js'
import { authRateLimitConfig } from '../../plugins/rateLimiter.js'
import { issueSession, type SessionUser } from './session.js'

/** Todo registro público nace como 'cliente'; los roles de staff solo los asigna un admin. */
const DEFAULT_ROLE = 'cliente'

/** `on conflict do nothing` evita la carrera entre "¿existe?" e "insertar" con dos registros simultáneos. */
async function insertCliente(input: RegisterInput): Promise<SessionUser> {
  const user = await db.one<SessionUser>(
    `insert into users (email, password_hash, role, nombre, cedula_enc, telefono_enc)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (email) do nothing
     returning id, email, role`,
    [input.email, await hashSecret(input.password), DEFAULT_ROLE, input.nombre, encrypt(input.cedula), encrypt(input.telefono)],
  )
  if (!user) throw new HttpError(409, 'EmailAlreadyRegistered')
  return user
}

export async function registerRoute(app: FastifyInstance) {
  app.post('/register', { config: { rateLimit: authRateLimitConfig } }, async (req, reply) => {
    const input = parseOrThrow(registerSchema, req.body)
    const user = await insertCliente(input)
    const session = await issueSession(user)
    return reply.code(201).send({ userId: user.id, email: user.email, ...session })
  })
}
