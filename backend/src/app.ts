import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { env } from './lib/env.js'
import { db, HttpError } from './lib/db.js'
import { registerRateLimiter } from './plugins/rateLimiter.js'
import { authRoutes } from './routes/auth/index.js'
import { profileRoutes } from './routes/profile/index.js'
import { adminRoutes } from './routes/admin/index.js'
import { eventsRoutes } from './routes/events/index.js'
import { aiRoutes } from './routes/ai/index.js'
import { ticketsRoutes } from './routes/tickets/index.js'
import { settingsRoutes } from './routes/settings/index.js'
import { spotsRoutes } from './routes/spots/index.js'
import { paymentsRoutes } from './routes/payments/index.js'
import { tablesRoutes } from './routes/tables/index.js'
import { menuRoutes } from './routes/menu/index.js'
import { salesRoutes } from './routes/sales/index.js'
import { inventoryRoutes } from './routes/inventory/index.js'
import { dashboardRoutes } from './routes/dashboard/index.js'
import { ordersRoutes } from './routes/orders/index.js'
import { galleryRoutes } from './routes/gallery/index.js'
import { announcementsRoutes } from './routes/announcements/index.js'
import { listsRoutes } from './routes/lists/index.js'
import { ensureUploadsDir, isDiskUploadEnabled, UPLOADS_DIR } from './lib/uploads.js'
import { MAX_IMAGE_BYTES } from './lib/storage/index.js'

export async function buildServer() {
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

  // Errores de dominio: las rutas lanzan HttpError y aquí se traducen a una respuesta uniforme.
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({ error: err.code, ...err.details })
    }
    return reply.send(err)
  })

  await app.register(fastifyMultipart, {
    limits: { fileSize: MAX_IMAGE_BYTES },
  })
  // En Vercel no hay disco persistente: las imágenes van a Vercel Blob y no se sirven archivos locales.
  if (isDiskUploadEnabled()) {
    await app.register(fastifyStatic, {
      root: UPLOADS_DIR,
      prefix: '/uploads/',
      decorateReply: false,
    })
  }

  app.get('/health', async () => {
    await db.one('select 1')
    return { status: 'ok', env: env.NODE_ENV }
  })

  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(profileRoutes, { prefix: '/profile' })
  await app.register(adminRoutes, { prefix: '/admin' })
  await app.register(eventsRoutes, { prefix: '/events' })
  await app.register(aiRoutes, { prefix: '/ai' })
  await app.register(ticketsRoutes, { prefix: '/tickets' })
  await app.register(settingsRoutes, { prefix: '/settings' })
  await app.register(spotsRoutes)
  await app.register(paymentsRoutes, { prefix: '/admin/pagos' })
  await app.register(tablesRoutes)
  await app.register(menuRoutes, { prefix: '/menu' })
  await app.register(salesRoutes, { prefix: '/sales' })
  await app.register(inventoryRoutes, { prefix: '/inventory' })
  await app.register(dashboardRoutes, { prefix: '/dashboard' })
  await app.register(ordersRoutes, { prefix: '/orders' })
  await app.register(galleryRoutes, { prefix: '/gallery' })
  await app.register(announcementsRoutes, { prefix: '/announcements' })
  await app.register(listsRoutes, { prefix: '/lists' })

  return app
}
