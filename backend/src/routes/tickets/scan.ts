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
  qr_used: boolean
  status: string
}

const findTicket = (qrToken: string) =>
  db.one<TicketRow>(
    `select t.id, t.nombre, t.ticket_type, t.qr_used, t.status, e.title as event_title
       from tickets t join events e on e.id = t.event_id
      where t.qr_token = $1`,
    [qrToken],
  )

/** Marca el QR como usado solo si nadie lo marcó antes: dos porteros no pueden dejar pasar el mismo QR. */
const markAsUsed = (ticketId: string) =>
  db.run('update tickets set qr_used = true, qr_used_at = now() where id = $1 and not qr_used', [ticketId])

export async function scanTicketRoute(app: FastifyInstance) {
  app.post(
    '/scan',
    { preHandler: [verifyAuth, requireRole('portero', 'admin')] },
    async (req, reply) => {
      const parsed = scanSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues })
      }

      const ticket = await findTicket(parsed.data.qr_token)
      if (!ticket) {
        return reply.send({ valid: false, reason: 'InvalidQR', message: 'QR no encontrado en el sistema' })
      }

      const holder = { nombre: ticket.nombre, ticket_type: ticket.ticket_type, event_title: ticket.event_title }

      if (ticket.status !== 'confirmed') {
        return reply.send({ valid: false, reason: 'TicketNotConfirmed', message: `Estado del tiquete: ${ticket.status}`, ...holder })
      }
      if (ticket.qr_used || (await markAsUsed(ticket.id)) === 0) {
        return reply.send({ valid: false, reason: 'AlreadyUsed', message: 'Este QR ya fue escaneado', ...holder })
      }
      return reply.send({ valid: true, ...holder })
    }
  )
}
