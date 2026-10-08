import type { FastifyInstance } from 'fastify'
import rateLimit from '@fastify/rate-limit'

export async function registerRateLimiter(app: FastifyInstance) {
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    // Per-route auth limits are set via route config (see authRateLimitConfig below).
  })
}

// Apply to /auth/* routes via { config: { rateLimit: authRateLimitConfig } }
export const authRateLimitConfig = {
  max: 5,
  timeWindow: '15 minutes',
  ban: 3, // 3 violations -> 1 hour ban
} as const

/** El chat de IA consume tokens de pago: límite estricto por IP. */
export const aiChatRateLimitConfig = {
  max: 20,
  timeWindow: '1 minute',
} as const

/** Pedidos públicos desde el QR de mesa: suficiente para una mesa real, frena el spam. */
export const tableOrderRateLimitConfig = {
  max: 10,
  timeWindow: '1 minute',
} as const
