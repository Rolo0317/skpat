import type { FastifyInstance } from 'fastify'
import { parseOrThrow, resetPasswordSchema } from '../../lib/schemas.js'
import { hashSecret } from '../../lib/argon2.js'
import { db, HttpError } from '../../lib/db.js'
import { authRateLimitConfig } from '../../plugins/rateLimiter.js'
import { hashResetToken } from './resetTokens.js'

/**
 * Consume el token de forma atómica (el UPDATE condicionado impide usarlo dos veces en paralelo)
 * y cambia la contraseña en la misma transacción.
 */
async function consumeTokenAndSetPassword(token: string, passwordHash: string): Promise<string> {
  return db.transaction(async (tx) => {
    const consumed = await tx.one<{ user_id: string }>(
      `update reset_tokens set used = true
        where token_hash = $1 and not used and expires_at > now()
        returning user_id`,
      [hashResetToken(token)],
    )
    if (!consumed) throw new HttpError(400, 'Invalid or expired token')
    await tx.run('update users set password_hash = $1 where id = $2', [passwordHash, consumed.user_id])
    return consumed.user_id
  })
}

export async function resetPasswordRoute(app: FastifyInstance) {
  app.post('/reset-password', { config: { rateLimit: authRateLimitConfig } }, async (req, reply) => {
    const { token, password } = parseOrThrow(resetPasswordSchema, req.body)
    const userId = await consumeTokenAndSetPassword(token, await hashSecret(password))
    req.log.info({ userId }, 'Password reset successfully')
    return reply.send({ message: 'Password updated successfully' })
  })
}
