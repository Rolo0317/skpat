import type { FastifyInstance } from 'fastify'
import { createHash } from 'node:crypto'
import { resetPasswordSchema } from '../../lib/schemas.js'
import { hashSecret } from '../../lib/argon2.js'
import { db } from '../../lib/db.js'
import { authRateLimitConfig } from '../../plugins/rateLimiter.js'

type ResetTokenRow = {
  id: string
  user_id: string
  token_hash: string
  expires_at: number
  used: number
}

export async function resetPasswordRoute(app: FastifyInstance) {
  app.post(
    '/reset-password',
    { config: { rateLimit: authRateLimitConfig } },
    async (req, reply) => {
      const parsed = resetPasswordSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues })
      }

      const { token, password } = parsed.data

      // Hash the incoming token the same way we stored it
      const tokenHash = createHash('sha256').update(token).digest('hex')

      // Look up token: must be unused and not expired
      // expires_at is stored as ms since epoch; unixepoch() * 1000 gives current ms
      const stored = db
        .prepare(
          `SELECT id, user_id, token_hash, expires_at, used
           FROM reset_tokens
           WHERE token_hash = ? AND used = 0 AND expires_at > (unixepoch() * 1000)`
        )
        .get(tokenHash) as ResetTokenRow | undefined

      if (!stored) {
        return reply.code(400).send({ error: 'Invalid or expired token' })
      }

      // Hash the new password with argon2id
      const newPasswordHash = await hashSecret(password)

      // Update password and mark token as used in a single transaction
      const update = db.transaction(() => {
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
          newPasswordHash,
          stored.user_id
        )
        db.prepare('UPDATE reset_tokens SET used = 1 WHERE id = ?').run(stored.id)
      })
      update()

      req.log.info({ userId: stored.user_id }, 'Password reset successfully')
      return reply.code(200).send({ message: 'Password updated successfully' })
    }
  )
}
