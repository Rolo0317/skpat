import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { verifyAuth } from '../../plugins/auth.js'
import { generateQrDataUrl } from '../../lib/qr.js'

interface TicketRow {
  id: string
  event_id: string
  event_title: string
  event_date: Date
  nombre: string
  email: string
  ticket_type: string
  price_cents: number
  status: string
  qr_token: string
  qr_used: boolean
  qr_used_at: Date | null
  created_at: Date
}

export async function myTicketsRoute(app: FastifyInstance) {
  app.get('/mine', { preHandler: [verifyAuth] }, async (req, reply) => {
    const rows = await db.many<TicketRow>(
      `select t.id, t.event_id, e.title as event_title, e.date as event_date,
              t.nombre, t.email, t.ticket_type, t.price_cents,
              t.status, t.qr_token, t.qr_used, t.qr_used_at, t.created_at
         from tickets t join events e on e.id = t.event_id
        where t.user_id = $1
        order by t.created_at desc`,
      [req.user!.id],
    )
    const tickets = await Promise.all(
      rows.map(async (row) => ({ ...row, qr_data_url: await generateQrDataUrl(row.qr_token) })),
    )
    return reply.send(tickets)
  })
}
