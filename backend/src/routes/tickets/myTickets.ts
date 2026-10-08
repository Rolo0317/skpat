import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { verifyAuth } from '../../plugins/auth.js'
import { generateQrDataUrl } from '../../lib/qr.js'
import { eventWhatsappUrl } from '../../services/whatsapp.js'

interface TicketRow {
  id: string
  event_id: string
  event_title: string
  event_date: Date
  nombre: string
  email: string
  ticket_type: string
  price_cents: number
  price_stage: string | null
  status: string
  qr_token: string
  qr_used: boolean
  qr_used_at: Date | null
  guest_list_id: string | null
  promoter_id: string | null
  created_at: Date
}

/** El QR solo se entrega con el pago confirmado; mientras tanto, el enlace para cerrar el pago por WhatsApp. */
async function presentTicket({ qr_token, guest_list_id, promoter_id, ...ticket }: TicketRow) {
  if (ticket.status === 'confirmed') {
    return { ...ticket, qr_data_url: await generateQrDataUrl(qr_token), whatsapp_url: null }
  }
  const whatsapp_url = ticket.status === 'pending_payment'
    ? await eventWhatsappUrl({
      eventId: ticket.event_id, guestListId: guest_list_id, promoterId: promoter_id, eventTitle: ticket.event_title,
      tipo: ticket.price_stage ? `Entrada general - ${ticket.price_stage}` : ticket.ticket_type,
      nombre: ticket.nombre, referencia: ticket.id,
    })
    : null
  return { ...ticket, qr_data_url: null, whatsapp_url }
}

export async function myTicketsRoute(app: FastifyInstance) {
  app.get('/mine', { preHandler: [verifyAuth] }, async (req, reply) => {
    const rows = await db.many<TicketRow>(
      `select t.id, t.event_id, e.title as event_title, e.date as event_date,
              t.nombre, t.email, t.ticket_type, t.price_cents, t.price_stage,
              t.status, t.qr_token, t.qr_used, t.qr_used_at, t.guest_list_id, t.promoter_id, t.created_at
         from tickets t join events e on e.id = t.event_id
        where t.user_id = $1
        order by t.created_at desc`,
      [req.user!.id],
    )
    return reply.send(await Promise.all(rows.map(presentTicket)))
  })
}
