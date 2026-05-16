import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'

export async function listMenuRoute(app: FastifyInstance) {
  // Public: returns active menu items grouped by category
  app.get('/', async (_req, reply) => {
    const items = db.prepare(
      'SELECT id, name, description, category, price_cents, sort_order FROM menu_items WHERE is_active = 1 ORDER BY category, sort_order, name'
    ).all()
    return reply.send(items)
  })
}
