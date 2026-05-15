import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'

const scanSchema = z.object({
  qr_token: z.string().min(10),
})

interface TicketRow {
  id: string
  nombre: string
  ticket_type: string
  event_title: string
  qr_used: number
  status: string
}

export async function scanTicketRoute(app: FastifyInstance) {
  app.post(
    '/scan',
    { preHandler: [verifyAuth, requireRole('portero', 'admin')] },
    async (req, reply) => {
      const parsed = scanSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues })
      }

      const { qr_token } = parsed.data

      // Find ticket with event info
      const ticket = db
        .prepare(`
          SELECT t.id, t.nombre, t.ticket_type, t.qr_used, t.status,
                 e.title AS event_title
          FROM tickets t
          JOIN events e ON e.id = t.event_id
          WHERE t.qr_token = ?
        `)
        .get(qr_token) as TicketRow | undefined

      if (!ticket) {
        return reply.code(200).send({
          valid: false,
          reason: 'InvalidQR',
          message: 'QR no encontrado en el sistema',
        })
      }

      if (ticket.qr_used === 1) {
        return reply.code(200).send({
          valid: false,
          reason: 'AlreadyUsed',
          message: 'Este QR ya fue escaneado',
          nombre: ticket.nombre,
          ticket_type: ticket.ticket_type,
          event_title: ticket.event_title,
        })
      }

      if (ticket.status !== 'confirmed') {
        return reply.code(200).send({
          valid: false,
          reason: 'TicketNotConfirmed',
          message: `Estado del tiquete: ${ticket.status}`,
          nombre: ticket.nombre,
          ticket_type: ticket.ticket_type,
          event_title: ticket.event_title,
        })
      }

      // Mark as used
      db.prepare(
        'UPDATE tickets SET qr_used = 1, qr_used_at = unixepoch() WHERE id = ?'
      ).run(ticket.id)

      return reply.code(200).send({
        valid: true,
        nombre: ticket.nombre,
        ticket_type: ticket.ticket_type,
        event_title: ticket.event_title,
      })
    }
  )
}
