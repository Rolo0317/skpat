import type { FastifyInstance } from 'fastify'
import { parseOrThrow, refreshSchema } from '../../lib/schemas.js'
import { verifySecret } from '../../lib/argon2.js'
import { verifyRefreshToken } from '../../lib/jwt.js'
import { isUuid } from '../../lib/ids.js'
import { db, HttpError } from '../../lib/db.js'
import { authRateLimitConfig } from '../../plugins/rateLimiter.js'
import { issueSession, type SessionUser } from './session.js'

interface StoredRefreshToken {
  id: string
  token_hash: string
  user_id: string
  email: string
  role: SessionUser['role']
}

const invalidRefreshToken = () => new HttpError(401, 'InvalidRefreshToken')

async function readTokenId(refreshToken: string): Promise<string> {
  const payload = await verifyRefreshToken(refreshToken).catch(() => undefined)
  if (!payload || !isUuid(payload.tokenId)) throw invalidRefreshToken()
  return payload.tokenId
}

const findActiveToken = (tokenId: string) =>
  db.one<StoredRefreshToken>(
    `select rt.id, rt.token_hash, u.id as user_id, u.email, u.role
       from refresh_tokens rt join users u on u.id = rt.user_id
      where rt.id = $1 and not rt.revoked and rt.expires_at > now()`,
    [tokenId],
  )

/** El hash debe coincidir: impide sustituir un token firmado por otro con el mismo id. */
async function findVerifiedToken(refreshToken: string): Promise<StoredRefreshToken> {
  const stored = await findActiveToken(await readTokenId(refreshToken))
  if (!stored || !(await verifySecret(stored.token_hash, refreshToken))) throw invalidRefreshToken()
  return stored
}

/** Rotación: revoca el token usado y emite uno nuevo en la misma transacción. */
async function rotate(stored: StoredRefreshToken) {
  return db.transaction(async (tx) => {
    const revoked = await tx.run('update refresh_tokens set revoked = true where id = $1 and not revoked', [stored.id])
    if (revoked === 0) throw invalidRefreshToken()
    return issueSession({ id: stored.user_id, email: stored.email, role: stored.role }, tx)
  })
}

export async function refreshRoute(app: FastifyInstance) {
  app.post('/refresh', { config: { rateLimit: authRateLimitConfig } }, async (req, reply) => {
    const { refresh_token } = parseOrThrow(refreshSchema, req.body)
    const stored = await findVerifiedToken(refresh_token)
    return reply.send(await rotate(stored))
  })
}
