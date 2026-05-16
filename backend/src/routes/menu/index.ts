import type { FastifyInstance } from 'fastify'
import { listMenuRoute } from './list.js'
import { createMenuItemRoute } from './create.js'
import { updateMenuItemRoute } from './update.js'

export async function menuRoutes(app: FastifyInstance) {
  await listMenuRoute(app)
  await createMenuItemRoute(app)
  await updateMenuItemRoute(app)
}
