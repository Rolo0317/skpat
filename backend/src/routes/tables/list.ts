import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'

export async function listTablesRoute(app: FastifyInstance) {
  // Público: la carta de cada mesa se abre con su QR.
  app.get('/tables', async (_req, reply) => {
    const tables = await db.many('select id, number, label, qr_token from tables where is_active order by number')
    return reply.send(tables)
  })
}
