import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'

export async function listTablesRoute(app: FastifyInstance) {
  // Public: returns all active tables with their QR tokens
  app.get('/tables', async (_req, reply) => {
    const tables = db.prepare(
      'SELECT id, number, label, qr_token FROM tables WHERE is_active = 1 ORDER BY number ASC'
    ).all()
    return reply.send(tables)
  })
}
