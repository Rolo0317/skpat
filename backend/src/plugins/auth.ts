import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { verifyAccessToken, type SkpatRole } from '../lib/jwt.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; email: string; role: SkpatRole }
  }
}

const BEARER_PREFIX = 'bearer '

function bearerToken(req: FastifyRequest): string | undefined {
  const header = req.headers.authorization
  if (!header?.toLowerCase().startsWith(BEARER_PREFIX)) return undefined
  return header.slice(BEARER_PREFIX.length).trim()
}

async function userFromToken(token: string): Promise<NonNullable<FastifyRequest['user']>> {
  const payload = await verifyAccessToken(token)
  return { id: payload.sub, email: payload.email ?? '', role: payload.role ?? 'cliente' }
}

/** Exige sesión válida: sin token o con token inválido responde 401. */
export async function verifyAuth(req: FastifyRequest, reply: FastifyReply) {
  const token = bearerToken(req)
  if (!token) {
    return reply.code(401).send({ error: 'MissingAuthorizationHeader' })
  }
  try {
    req.user = await userFromToken(token)
  } catch (err) {
    req.log.warn({ err }, 'JWT verification failed')
    return reply.code(401).send({ error: 'InvalidToken' })
  }
}

/**
 * Sesión opcional (p. ej. compra de tiquetes): si llega un token válido se asocia el usuario;
 * si no hay token o está vencido, la petición sigue como anónima en vez de fallar.
 */
export async function optionalAuth(req: FastifyRequest) {
  const token = bearerToken(req)
  if (!token) return
  try {
    req.user = await userFromToken(token)
  } catch (err) {
    req.log.info({ err }, 'Ignoring invalid optional token')
  }
}

// Optional helper (used in plan 01-03 for role guards):
export function requireRole(...roles: SkpatRole[]) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    if (!req.user) {
      return reply.code(401).send({ error: 'Unauthenticated' })
    }
    if (!roles.includes(req.user.role)) {
      return reply.code(403).send({ error: 'Forbidden', requiredRoles: roles })
    }
  }
}

// No-op plugin export so it can be registered if desired
export default async function authPlugin(_app: FastifyInstance) {
  // Nothing to register — exports are imported directly by route files.
}
