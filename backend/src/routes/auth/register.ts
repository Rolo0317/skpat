import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { registerSchema } from '../../lib/schemas.js'
import { encrypt } from '../../lib/encrypt.js'
import { hashSecret } from '../../lib/argon2.js'
import { signAccessToken, signRefreshToken } from '../../lib/jwt.js'
import { db } from '../../lib/db.js'
import { authRateLimitConfig } from '../../plugins/rateLimiter.js'

export async function registerRoute(app: FastifyInstance) {
  app.post(
    '/register',
    { config: { rateLimit: authRateLimitConfig } },
    async (req, reply) => {
      const parsed = registerSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'ValidationError',
          issues: parsed.error.issues,
        })
      }
      const { email, password, nombre, cedula, telefono } = parsed.data

      // Check for duplicate email
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
      if (existing) {
        return reply.code(409).send({ error: 'EmailAlreadyRegistered' })
      }

      // Hash password with argon2id
      const password_hash = await hashSecret(password)

      // Encrypt PII fields
      const cedula_enc = encrypt(cedula)
      const telefono_enc = encrypt(telefono)

      // Insert user with default role 'cliente'
      const userId = randomUUID()
      db.prepare(`
        INSERT INTO users (id, email, password_hash, role, nombre, cedula_enc, telefono_enc)
        VALUES (?, ?, ?, 'cliente', ?, ?, ?)
      `).run(userId, email, password_hash, nombre, cedula_enc, telefono_enc)

      // Issue tokens
      const accessToken = await signAccessToken({ sub: userId, email, role: 'cliente' })
      const tokenId = randomUUID()
      const refreshToken = await signRefreshToken({ sub: userId, tokenId })

      // Store refresh token hash
      const { hashSecret: hashToken } = await import('../../lib/argon2.js')
      const tokenHash = await hashToken(refreshToken)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      db.prepare(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(tokenId, userId, tokenHash, expiresAt)

      return reply.code(201).send({
        userId,
        email,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900, // 15 minutes in seconds
      })
    }
  )
}
