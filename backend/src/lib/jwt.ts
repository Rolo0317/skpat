import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { env } from './env.js'

export type SkpatRole = 'cliente' | 'mesero' | 'portero' | 'admin'

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
    .setExpirationTime('15m')
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
    .setExpirationTime('7d')
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
