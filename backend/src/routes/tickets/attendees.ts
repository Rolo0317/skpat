import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { isUuid } from '../../lib/ids.js'
import { decrypt } from '../../lib/encrypt.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'

interface AttendeeRow {
  id: string
  nombre: string
  email: string
  cedula_enc: string
  ticket_type: string
  price_cents: number
  status: string
  qr_used: boolean
  qr_used_at: Date | null
  created_at: Date
}

function safeDecrypt(ciphertext: string): string {
  try { return decrypt(ciphertext) } catch { return '[cifrado]' }
}

export async function listAttendeesRoute(app: FastifyInstance) {
  app.get(
    '/event/:event_id',
    { preHandler: [verifyAuth, requireRole('admin')] },
    async (req, reply) => {
      const { event_id } = req.params as { event_id: string }
      const event = isUuid(event_id)
        ? await db.one<{ id: string; title: string }>('select id, title from events where id = $1', [event_id])
        : undefined
      if (!event) return reply.code(404).send({ error: 'EventNotFound' })

      const rows = await db.many<AttendeeRow>(
        `select id, nombre, email, cedula_enc, ticket_type, price_cents, status, qr_used, qr_used_at, created_at
           from tickets where event_id = $1 order by created_at desc`,
        [event_id],
      )
      const attendees = rows.map(({ cedula_enc, ...row }) => ({ ...row, cedula: safeDecrypt(cedula_enc) }))

      return reply.send({
        event_id: event.id,
        event_title: event.title,
        total: attendees.length,
        scanned: attendees.filter((a) => a.qr_used).length,
        attendees,
      })
    }
  )
}
