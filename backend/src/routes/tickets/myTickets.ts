import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { verifyAuth } from '../../plugins/auth.js'
import { generateQrDataUrl } from '../../lib/qr.js'

interface TicketRow {
  id: string
  event_id: string
  event_title: string
  event_date: string
  nombre: string
  email: string
  ticket_type: string
  price_cents: number
  status: string
  qr_token: string
  qr_used: number
  qr_used_at: number | null
  created_at: number
}

export async function myTicketsRoute(app: FastifyInstance) {
  app.get(
    '/mine',
    { preHandler: [verifyAuth] },
    async (req, reply) => {
      const userId = req.user!.id

      const rows = db
        .prepare(`
          SELECT t.id, t.event_id, e.title AS event_title, e.date AS event_date,
                 t.nombre, t.email, t.ticket_type, t.price_cents,
                 t.status, t.qr_token, t.qr_used, t.qr_used_at, t.created_at
          FROM tickets t
          JOIN events e ON e.id = t.event_id
          WHERE t.user_id = ?
          ORDER BY t.created_at DESC
        `)
        .all(userId) as TicketRow[]

      // Generate QR data URLs for each ticket
      const tickets = await Promise.all(
        rows.map(async (row) => ({
          id: row.id,
          event_id: row.event_id,
          event_title: row.event_title,
          event_date: row.event_date,
          nombre: row.nombre,
          email: row.email,
          ticket_type: row.ticket_type,
          price_cents: row.price_cents,
          status: row.status,
          qr_token: row.qr_token,
          qr_data_url: await generateQrDataUrl(row.qr_token),
          qr_used: row.qr_used === 1,
          qr_used_at: row.qr_used_at ? new Date(row.qr_used_at * 1000).toISOString() : null,
          created_at: new Date(row.created_at * 1000).toISOString(),
        }))
      )

      return reply.code(200).send(tickets)
    }
  )
}
