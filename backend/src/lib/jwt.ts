import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { env } from './env.js'
import type { SkpatRole } from './schemas.js'

export type { SkpatRole } from './schemas.js'

const SECONDS_PER_DAY = 24 * 60 * 60
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
export const REFRESH_TOKEN_TTL_SECONDS = 7 * SECONDS_PER_DAY

export interface AccessTokenPayload extends JWTPayload {
  sub: string       // user id (uuid)
  email: string
  role: SkpatRole
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string       // user id (uuid)
  tokenId: string   // unique refresh token id (for revocation)
}

function accessKey(): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET)
}

function refreshKey(): Uint8Array {
  return new TextEncoder().encode(env.JWT_REFRESH_SECRET)
}

export async function signAccessToken(payload: {
  sub: string
  email: string
  role: SkpatRole
}): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessKey())
}

export async function signRefreshToken(payload: {
  sub: string
  tokenId: string
}): Promise<string> {
  return new SignJWT({ tokenId: payload.tokenId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_SECONDS}s`)
    .sign(refreshKey())
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, accessKey(), {
    algorithms: ['HS256'],
  })
  if (!payload.sub) {
    throw new Error('Access token missing sub claim')
  }
  return payload as AccessTokenPayload
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, refreshKey(), {
    algorithms: ['HS256'],
  })
  if (!payload.sub) {
    throw new Error('Refresh token missing sub claim')
  }
  return payload as RefreshTokenPayload
}
