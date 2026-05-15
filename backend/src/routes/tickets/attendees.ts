import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { decrypt } from '../../lib/encrypt.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'

interface TicketAttendeeRow {
  id: string
  nombre: string
  email: string
  cedula_enc: string
  ticket_type: string
  price_cents: number
  status: string
  qr_used: number
  qr_used_at: number | null
  created_at: number
}

export async function listAttendeesRoute(app: FastifyInstance) {
  app.get(
    '/event/:event_id',
    { preHandler: [verifyAuth, requireRole('admin')] },
    async (req, reply) => {
      const { event_id } = req.params as { event_id: string }

      // Verify event exists
      const event = db
        .prepare('SELECT id, title FROM events WHERE id = ?')
        .get(event_id) as { id: string; title: string } | undefined

      if (!event) {
        return reply.code(404).send({ error: 'EventNotFound' })
      }

      const rows = db
        .prepare(`
          SELECT id, nombre, email, cedula_enc, ticket_type, price_cents,
                 status, qr_used, qr_used_at, created_at
          FROM tickets
          WHERE event_id = ?
          ORDER BY created_at DESC
        `)
        .all(event_id) as TicketAttendeeRow[]

      const attendees = rows.map((row) => ({
        id: row.id,
        nombre: row.nombre,
        email: row.email,
        cedula: (() => {
          try { return decrypt(row.cedula_enc) } catch { return '[cifrado]' }
        })(),
        ticket_type: row.ticket_type,
        price_cents: row.price_cents,
        status: row.status,
        qr_used: row.qr_used === 1,
        qr_used_at: row.qr_used_at ? new Date(row.qr_used_at * 1000).toISOString() : null,
        created_at: new Date(row.created_at * 1000).toISOString(),
      }))

      return reply.code(200).send({
        event_id: event.id,
        event_title: event.title,
        total: attendees.length,
        scanned: attendees.filter((a) => a.qr_used).length,
        attendees,
      })
    }
  )
}
