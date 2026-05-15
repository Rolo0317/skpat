import type { FastifyInstance } from 'fastify'
import { randomBytes, createHash } from 'node:crypto'
import { recoverSchema } from '../../lib/schemas.js'
import { db } from '../../lib/db.js'
import { authRateLimitConfig } from '../../plugins/rateLimiter.js'

type UserRow = { id: string }

export async function recoverRoute(app: FastifyInstance) {
  app.post(
    '/recover',
    { config: { rateLimit: authRateLimitConfig } },
    async (req, reply) => {
      const parsed = recoverSchema.safeParse(req.body)
      if (!parsed.success) {
        // Return the same response regardless of validation — prevent enumeration
        return reply.code(200).send({ message: 'If that email exists, a recovery link was sent' })
      }

      const { email } = parsed.data

      // Look up user — but always return 200 regardless of whether found
      const user = db
        .prepare('SELECT id FROM users WHERE email = ?')
        .get(email) as UserRow | undefined

      if (user) {
        // Generate a cryptographically secure 32-byte (64 hex char) token
        const token = randomBytes(32).toString('hex')
        const tokenHash = createHash('sha256').update(token).digest('hex')
        const expiresAt = Date.now() + 3_600_000 // 1 hour from now in ms

        // Invalidate any previous unused reset tokens for this user
        db.prepare('UPDATE reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(user.id)

        // Store the hashed token
        db.prepare(`
          INSERT INTO reset_tokens (user_id, token_hash, expires_at)
          VALUES (?, ?, ?)
        `).run(user.id, tokenHash, expiresAt)

        if (process.env.NODE_ENV !== 'production') {
          console.log(
            '[DEV] Password reset link: http://localhost:5173/reset-password#token=' +
              token +
              '&type=recovery'
          )
        }
        // In production: TODO — email sending not yet configured (SMTP/SendGrid/Resend)
      }

      req.log.info({ email }, 'Password recovery requested')
      return reply.code(200).send({ message: 'If that email exists, a recovery link was sent' })
    }
  )
}
