import type { FastifyInstance } from 'fastify'
import { recoverSchema } from '../../lib/schemas.js'
import { db } from '../../lib/db.js'
import { env } from '../../lib/env.js'
import { authRateLimitConfig } from '../../plugins/rateLimiter.js'
import { generateResetToken, hashResetToken, RESET_TOKEN_TTL_MS } from './resetTokens.js'

/** Respuesta idéntica exista o no el email, incluso si es inválido: evita enumerar cuentas. */
const GENERIC_RESPONSE = { message: 'If that email exists, a recovery link was sent' }

const findUserIdByEmail = async (email: string) =>
  (await db.one<{ id: string }>('select id from users where email = $1', [email]))?.id

/** Invalida los tokens anteriores sin usar y guarda el hash del nuevo. */
async function createResetToken(userId: string): Promise<string> {
  const token = generateResetToken()
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)
  await db.transaction(async (tx) => {
    await tx.run('update reset_tokens set used = true where user_id = $1 and not used', [userId])
    await tx.run(
      'insert into reset_tokens (user_id, token_hash, expires_at) values ($1, $2, $3)',
      [userId, hashResetToken(token), expiresAt],
    )
  })
  return token
}

// Sin proveedor de correo para recuperación todavía: fuera de producción el enlace se muestra en el log.
function deliverResetLink(token: string): void {
  if (env.NODE_ENV === 'production') return
  console.log(`[DEV] Password reset link: ${env.FRONTEND_URL}/reset-password#token=${token}&type=recovery`)
}

export async function recoverRoute(app: FastifyInstance) {
  app.post('/recover', { config: { rateLimit: authRateLimitConfig } }, async (req, reply) => {
    const parsed = recoverSchema.safeParse(req.body)
    const userId = parsed.success ? await findUserIdByEmail(parsed.data.email) : undefined
    if (userId) deliverResetLink(await createResetToken(userId))
    req.log.info('Password recovery requested')
    return reply.send(GENERIC_RESPONSE)
  })
}
