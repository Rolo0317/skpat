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

      // Pre-compute side-effect-free values
      const qrToken = generateQrToken()
      const cedulaEnc = encrypt(cedula)
      const telefonoEnc = telefono ? encrypt(telefono) : null
      const userId = req.user?.id ?? null

      // Atomic transaction: check event, validate spots, decrement, insert ticket
      interface EventRow { id: string; title: string; date: string; price: number; available_spots: number; is_active: number }
      interface TxResult { event: EventRow; ticketId: string; priceCents: number }

      const purchaseTx = db.transaction((): TxResult => {
        const ev = db.prepare(
          'SELECT id, title, date, price, available_spots, is_active FROM events WHERE id = ?'
        ).get(event_id) as EventRow | undefined

        if (!ev) {
          const err = new Error('EventNotFound') as Error & { statusCode: number }
          err.statusCode = 404
          throw err
        }
        if (!ev.is_active) {
          const err = new Error('EventNotActive') as Error & { statusCode: number }
          err.statusCode = 422
          throw err
        }
        if (ev.available_spots <= 0) {
          const err = new Error('SoldOut') as Error & { statusCode: number }
          err.statusCode = 422
          throw err
        }

        const priceCents = ticket_type === 'general'
          ? ev.price
          : (PALCO_PRICES_CENTS[ticket_type] ?? ev.price)

        db.prepare('UPDATE events SET available_spots = available_spots - 1 WHERE id = ?').run(event_id)

        const row = db.prepare(`
          INSERT INTO tickets
            (event_id, user_id, nombre, cedula_enc, email, telefono_enc, qr_token, ticket_type, price_cents)
          VALUES
            (@event_id, @user_id, @nombre, @cedula_enc, @email, @telefono_enc, @qr_token, @ticket_type, @price_cents)
          RETURNING id
        `).get({
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

        return { event: ev, ticketId: row.id, priceCents }
      })

      let txOut: TxResult
      try {
        txOut = purchaseTx()
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string }
        if (e.statusCode === 404) return reply.code(404).send({ error: 'EventNotFound' })
        if (e.statusCode === 422 && e.message === 'EventNotActive') return reply.code(422).send({ error: 'EventNotActive' })
        if (e.statusCode === 422 && e.message === 'SoldOut') return reply.code(422).send({ error: 'SoldOut' })
        throw err
      }

      const { event: ev, ticketId, priceCents } = txOut

      // QR data URL generation (async — MUST be after commit)
      const qrDataUrl = await generateQrDataUrl(qrToken)

      // Send email — non-fatal if it fails
      try {
        await sendTicketEmail({
          to: email,
          nombre,
          eventTitle: ev.title,
          eventDate: new Date(ev.date).toLocaleString('es-CO', {
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
        app.log.warn({ emailErr }, 'Failed to send ticket email')
      }

      return reply.code(201).send({
        ticket_id: ticketId,
        qr_token: qrToken,
        qr_data_url: qrDataUrl,
        event_title: ev.title,
        ticket_type,
        price_cents: priceCents,
      })
    }
  )
}
