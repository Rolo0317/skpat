import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { verifyAccessToken, type SkpatRole } from '../lib/jwt.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; email: string; role: SkpatRole }
  }
}

export async function verifyAuth(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
    return reply.code(401).send({ error: 'MissingAuthorizationHeader' })
  }
  const token = auth.slice(7).trim()
  try {
    const payload = await verifyAccessToken(token)
    req.user = {
      id: payload.sub,
      email: payload.email ?? '',
      role: payload.role ?? 'cliente',
    }
  } catch (err) {
    req.log.warn({ err }, 'JWT verification failed')
    return reply.code(401).send({ error: 'InvalidToken' })
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
