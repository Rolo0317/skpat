import type { FastifyInstance } from 'fastify'
import { recoverSchema } from '../../lib/schemas.js'
import { authRateLimitConfig } from '../../plugins/rateLimiter.js'

export async function recoverRoute(app: FastifyInstance) {
  app.post(
    '/recover',
    { config: { rateLimit: authRateLimitConfig } },
    async (req, reply) => {
      const parsed = recoverSchema.safeParse(req.body)
      if (!parsed.success) {
        // Even for bad input, return 200 to prevent enumeration of which emails 400 vs 200
        return reply.code(200).send({ ok: true })
      }
      // TODO: implement email delivery (sendgrid/smtp) in plan 01-03.
      // For now, we acknowledge the request without branching on email existence (prevents enumeration).
      // In a real implementation: generate a reset token, store it in DB with expiry, send email.
      req.log.info({ email: parsed.data.email }, 'Password recovery requested (email sending not yet implemented)')
      return reply.code(200).send({ ok: true })
    }
  )
}
