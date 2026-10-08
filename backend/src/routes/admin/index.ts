import type { FastifyInstance } from 'fastify'
import { assignRoleRoute } from './assignRole.js'
import { promotersAdminRoutes } from '../promoters/index.js'
import { settingsAdminRoutes } from '../settings/index.js'
import { uploadsAdminRoutes } from '../uploads/index.js'
import { galleryAdminRoutes } from '../gallery/index.js'
import { announcementsAdminRoutes } from '../announcements/index.js'
import { listsAdminRoutes } from '../lists/index.js'

/** Todo lo que cuelga de /admin; cada módulo exige rol admin en sus rutas. */
export async function adminRoutes(app: FastifyInstance) {
  await assignRoleRoute(app)
  await app.register(promotersAdminRoutes, { prefix: '/promoters' })
  await app.register(settingsAdminRoutes, { prefix: '/settings' })
  await app.register(uploadsAdminRoutes, { prefix: '/uploads' })
  await app.register(galleryAdminRoutes, { prefix: '/gallery' })
  await app.register(announcementsAdminRoutes, { prefix: '/announcements' })
  await app.register(listsAdminRoutes, { prefix: '/lists' })
}
