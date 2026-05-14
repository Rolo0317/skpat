import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { env } from './lib/env.js'
import { db } from './lib/db.js'
import { runMigrations } from './lib/migrations.js'
import { registerRateLimiter } from './plugins/rateLimiter.js'
import { authRoutes } from './routes/auth/index.js'
import { profileRoutes } from './routes/profile/index.js'
import { adminRoutes } from './routes/admin/index.js'

export async function buildServer() {
  // Run SQLite schema migrations before accepting any requests
  runMigrations()

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

  app.get('/health', async () => {
    db.prepare('SELECT 1').get()
    return { status: 'ok', env: env.NODE_ENV }
  })

  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(profileRoutes, { prefix: '/profile' })
  await app.register(adminRoutes, { prefix: '/admin' })

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
