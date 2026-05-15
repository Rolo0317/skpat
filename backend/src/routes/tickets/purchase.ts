import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { encrypt } from '../../lib/encrypt.js'
import { generateQrToken, generateQrDataUrl } from '../../lib/qr.js'
import { sendTicketEmail } from '../../lib/email.js'
import { PALCO_PRICES_CENTS, TICKET_TYPES } from '../../lib/ticketPrices.js'
import { verifyAuth } from '../../plugins/auth.js'

const purchaseSchema = z.object({
  event_id: z.string().min(1),
  nombre: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(255),
  cedula: z.string().regex(/^\d{5,15}$/, 'Cedula must be 5-15 digits'),
  telefono: z.string().regex(/^\d{7,15}$/).optional(),
  ticket_type: z.enum(['general', 'palco_silver', 'palco_gold', 'palco_platinum']).default('general'),
})

export async function purchaseTicketRoute(app: FastifyInstance) {
  app.post(
    '/purchase',
    async (req, reply) => {
      const parsed = purchaseSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues })
      }

      const { event_id, nombre, email, cedula, telefono, ticket_type } = parsed.data

      // Verify event exists and is active
      const event = db
        .prepare('SELECT id, title, date, price, is_active FROM events WHERE id = ?')
        .get(event_id) as { id: string; title: string; date: string; price: number; is_active: number } | undefined

      if (!event) {
        return reply.code(404).send({ error: 'EventNotFound' })
      }
      if (!event.is_active) {
        return reply.code(422).send({ error: 'EventNotActive' })
      }

      // Calculate price
      let priceCents: number
      if (ticket_type === 'general') {
        priceCents = event.price
      } else {
        priceCents = PALCO_PRICES_CENTS[ticket_type] ?? event.price
      }

      // Generate QR token
      const qrToken = generateQrToken()
      const qrDataUrl = await generateQrDataUrl(qrToken)

      // Encrypt PII
      const cedulaEnc = encrypt(cedula)
      const telefonoEnc = telefono ? encrypt(telefono) : null

      // Get user_id from JWT if authenticated (optional)
      const userId = req.user?.id ?? null

      // Insert ticket
      const stmt = db.prepare(`
        INSERT INTO tickets
          (event_id, user_id, nombre, cedula_enc, email, telefono_enc, qr_token, ticket_type, price_cents)
        VALUES
          (@event_id, @user_id, @nombre, @cedula_enc, @email, @telefono_enc, @qr_token, @ticket_type, @price_cents)
        RETURNING id
      `)

      const row = stmt.get({
        event_id,
        user_id: userId,
        nombre,
        cedula_enc: cedulaEnc,
        email,
        telefono_enc: telefonoEnc,
        qr_token: qrToken,
        ticket_type,
        price_cents: priceCents,
      }) as { id: string }

      // Send email (or log if no SMTP configured)
      try {
        await sendTicketEmail({
          to: email,
          nombre,
          eventTitle: event.title,
          eventDate: new Date(event.date).toLocaleString('es-CO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          ticketType: ticket_type,
          qrDataUrl,
          qrToken,
        })
      } catch (emailErr) {
        // Email failure is non-fatal — ticket is already saved
        app.log.warn({ emailErr }, 'Failed to send ticket email')
      }

      return reply.code(201).send({
        ticket_id: row.id,
        qr_token: qrToken,
        qr_data_url: qrDataUrl,
        event_title: event.title,
        ticket_type,
        price_cents: priceCents,
      })
    }
  )
}
