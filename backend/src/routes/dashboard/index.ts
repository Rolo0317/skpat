import type { FastifyInstance } from 'fastify'
import { summaryRoute } from './summary.js'
import { hoursRoute } from './hours.js'
import { inventoryStatusRoute } from './inventory.js'
import { liveRoute } from './live.js'

export async function dashboardRoutes(app: FastifyInstance) {
  await summaryRoute(app)
  await hoursRoute(app)
  await inventoryStatusRoute(app)
  await liveRoute(app)
}
