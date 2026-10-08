import { randomUUID } from 'node:crypto'
import { hashSecret } from '../../lib/argon2.js'
import { db, type SqlClient } from '../../lib/db.js'
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  signAccessToken,
  signRefreshToken,
  type SkpatRole,
} from '../../lib/jwt.js'

const MS_PER_SECOND = 1000

export interface SessionUser {
  id: string
  email: string
  role: SkpatRole
}

export interface SessionTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

/** Guarda solo el hash del refresh token: una fuga de la tabla no permite renovar sesiones. */
async function storeRefreshToken(executor: SqlClient, tokenId: string, userId: string, refreshToken: string) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * MS_PER_SECOND)
  await executor.run(
    'insert into refresh_tokens (id, user_id, token_hash, expires_at) values ($1, $2, $3, $4)',
    [tokenId, userId, await hashSecret(refreshToken), expiresAt],
  )
}

/** Emite un par access/refresh para el usuario y registra el refresh para poder revocarlo. */
export async function issueSession(user: SessionUser, executor: SqlClient = db): Promise<SessionTokens> {
  const tokenId = randomUUID()
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ sub: user.id, email: user.email, role: user.role }),
    signRefreshToken({ sub: user.id, tokenId }),
  ])
  await storeRefreshToken(executor, tokenId, user.id, refreshToken)
  return { access_token: accessToken, refresh_token: refreshToken, expires_in: ACCESS_TOKEN_TTL_SECONDS }
}
