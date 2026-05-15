import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { env } from './lib/env.js'
import { db } from './lib/db.js'
import { runMigrations } from './lib/migrations.js'
import { registerRateLimiter } from './plugins/rateLimiter.js'
import { authRoutes } from './routes/auth/index.js'
import { profileRoutes } from './routes/profile/index.js'
import { adminRoutes } from './routes/admin/index.js'
import { eventsRoutes } from './routes/events/index.js'
import { aiRoutes } from './routes/ai/index.js'
import { ticketsRoutes } from './routes/tickets/index.js'
import { palcosRoutes } from './routes/palcos/index.js'
import { ensureUploadsDir, UPLOADS_DIR } from './lib/uploads.js'

export async function buildServer() {
  // Run SQLite schema migrations before accepting any requests
  runMigrations()
  // Ensure uploads directory exists
  ensureUploadsDir()

  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
    // Trust proxy headers so rate-limit reads correct IP behind Render/Railway
    trustProxy: env.NODE_ENV === 'production',
  })

  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
    credentials: true,
  })

  await registerRateLimiter(app)

  await app.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  })
  await app.register(fastifyStatic, {
    root: UPLOADS_DIR,
    prefix: '/uploads/',
    decorateReply: false,
  })

  app.get('/health', async () => {
    db.prepare('SELECT 1').get()
    return { status: 'ok', env: env.NODE_ENV }
  })

  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(profileRoutes, { prefix: '/profile' })
  await app.register(adminRoutes, { prefix: '/admin' })
  await app.register(eventsRoutes, { prefix: '/events' })
  await app.register(aiRoutes, { prefix: '/ai' })
  await app.register(ticketsRoutes, { prefix: '/tickets' })
  await app.register(palcosRoutes, { prefix: '/palcos' })

  return app
}

if (process.env.NODE_ENV !== 'test') {
  const app = await buildServer()
  app.listen({ port: env.PORT, host: '0.0.0.0' })
    .then((addr) => app.log.info(`Skpat backend listening on ${addr}`))
    .catch((err) => {
      app.log.error(err)
      process.exit(1)
    })
}
