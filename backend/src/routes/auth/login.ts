import type { FastifyInstance } from 'fastify'
import { loginSchema, parseOrThrow } from '../../lib/schemas.js'
import { verifySecret } from '../../lib/argon2.js'
import { db, HttpError } from '../../lib/db.js'
import { authRateLimitConfig } from '../../plugins/rateLimiter.js'
import { issueSession, type SessionUser } from './session.js'

interface UserWithPassword extends SessionUser {
  password_hash: string
}

const findUserByEmail = (email: string) =>
  db.one<UserWithPassword>('select id, email, password_hash, role from users where email = $1', [email])

/** Misma respuesta para email inexistente y contraseña errada: no revela qué cuentas existen. */
async function authenticate(email: string, password: string): Promise<SessionUser> {
  const user = await findUserByEmail(email)
  if (!user || !(await verifySecret(user.password_hash, password))) {
    throw new HttpError(401, 'InvalidCredentials')
  }
  return { id: user.id, email: user.email, role: user.role }
}

export async function loginRoute(app: FastifyInstance) {
  app.post('/login', { config: { rateLimit: authRateLimitConfig } }, async (req, reply) => {
    const { email, password } = parseOrThrow(loginSchema, req.body)
    const user = await authenticate(email, password)
    const session = await issueSession(user)
    return reply.send({ ...session, user })
  })
}
