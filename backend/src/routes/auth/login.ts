import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { loginSchema, refreshSchema } from '../../lib/schemas.js'
import { verifySecret, hashSecret } from '../../lib/argon2.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js'
import { db } from '../../lib/db.js'
import { authRateLimitConfig } from '../../plugins/rateLimiter.js'

type UserRow = {
  id: string
  email: string
  password_hash: string
  role: 'cliente' | 'mesero' | 'portero' | 'admin'
}

type RefreshTokenRow = {
  id: string
  user_id: string
  token_hash: string
  expires_at: string
  revoked: number
}

export async function loginRoute(app: FastifyInstance) {
  app.post(
    '/login',
    { config: { rateLimit: authRateLimitConfig } },
    async (req, reply) => {
      const parsed = loginSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues })
      }
      const { email, password } = parsed.data

      const user = db.prepare('SELECT id, email, password_hash, role FROM users WHERE email = ?').get(email) as UserRow | undefined
      if (!user) {
        return reply.code(401).send({ error: 'InvalidCredentials' })
      }

      const valid = await verifySecret(user.password_hash, password)
      if (!valid) {
        return reply.code(401).send({ error: 'InvalidCredentials' })
      }

      // Issue tokens
      const accessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role })
      const tokenId = randomUUID()
      const refreshToken = await signRefreshToken({ sub: user.id, tokenId })

      // Store refresh token hash
      const tokenHash = await hashSecret(refreshToken)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      db.prepare(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(tokenId, user.id, tokenHash, expiresAt)

      return reply.code(200).send({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900, // 15 minutes in seconds
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      })
    }
  )

  app.post(
    '/refresh',
    { config: { rateLimit: authRateLimitConfig } },
    async (req, reply) => {
      const parsed = refreshSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues })
      }
      const { refresh_token } = parsed.data

      // Verify JWT signature and expiry
      let payload: { sub: string; tokenId: string }
      try {
        payload = await verifyRefreshToken(refresh_token) as { sub: string; tokenId: string }
      } catch {
        return reply.code(401).send({ error: 'InvalidRefreshToken' })
      }

      // Check if token exists and is not revoked
      const stored = db.prepare(
        'SELECT id, user_id, token_hash, expires_at, revoked FROM refresh_tokens WHERE id = ?'
      ).get(payload.tokenId) as RefreshTokenRow | undefined

      if (!stored || stored.revoked || new Date(stored.expires_at) < new Date()) {
        return reply.code(401).send({ error: 'InvalidRefreshToken' })
      }

      // Verify token hash matches (prevents token substitution)
      const hashMatch = await verifySecret(stored.token_hash, refresh_token)
      if (!hashMatch) {
        return reply.code(401).send({ error: 'InvalidRefreshToken' })
      }

      // Revoke old token (rotation)
      db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').run(stored.id)

      // Get user
      const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(stored.user_id) as UserRow | undefined
      if (!user) {
        return reply.code(401).send({ error: 'InvalidRefreshToken' })
      }

      // Issue new tokens
      const newAccessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role })
      const newTokenId = randomUUID()
      const newRefreshToken = await signRefreshToken({ sub: user.id, tokenId: newTokenId })
      const newTokenHash = await hashSecret(newRefreshToken)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      db.prepare(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(newTokenId, user.id, newTokenHash, expiresAt)

      return reply.code(200).send({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: 900,
      })
    }
  )
}
