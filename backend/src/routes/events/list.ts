import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'

export async function listEventsRoute(app: FastifyInstance) {
  app.get('/', async (_req, _reply) => {
    const rows = db
      .prepare(
        `SELECT id, title, date, description, price, image_url,
                available_spots, is_vip, is_active, created_at
         FROM events
         WHERE is_active = 1
         ORDER BY date ASC`
      )
      .all()
    return rows
  })
}
