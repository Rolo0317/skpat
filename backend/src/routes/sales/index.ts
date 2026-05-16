import type { FastifyInstance } from 'fastify'
import { createSaleRoute } from './create.js'
import { mySalesRoute } from './mine.js'
import { tonightSalesRoute } from './tonight.js'

export async function salesRoutes(app: FastifyInstance) {
  await createSaleRoute(app)
  await mySalesRoute(app)
  await tonightSalesRoute(app)
}
