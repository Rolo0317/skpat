import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { encrypt } from '../../lib/encrypt.js'
import { PALCO_PRICES_CENTS } from '../../lib/ticketPrices.js'

const reserveSchema = z.object({
  event_id: z.string().min(1),
  palco_tier: z.enum(['silver', 'gold', 'platinum']),
  nombre: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(255),
  telefono: z.string().regex(/^\d{7,15}$/).optional(),
})

export async function palcosRoutes(app: FastifyInstance) {
  app.post('/reserve', async (req, reply) => {
    const parsed = reserveSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues })
    }

    const { event_id, palco_tier, nombre, email, telefono } = parsed.data

    // Verify event exists and is active
    const event = db
      .prepare('SELECT id, title, date, is_active FROM events WHERE id = ?')
      .get(event_id) as { id: string; title: string; date: string; is_active: number } | undefined

    if (!event) {
      return reply.code(404).send({ error: 'EventNotFound' })
    }
    if (!event.is_active) {
      return reply.code(422).send({ error: 'EventNotActive' })
    }

    const ticketTypeKey = `palco_${palco_tier}` as const
    const priceCents = PALCO_PRICES_CENTS[ticketTypeKey] ?? 0
    const telefonoEnc = telefono ? encrypt(telefono) : null

    const stmt = db.prepare(`
      INSERT INTO palco_reservations
        (event_id, palco_tier, nombre, email, telefono_enc, price_cents)
      VALUES
        (@event_id, @palco_tier, @nombre, @email, @telefono_enc, @price_cents)
      RETURNING id, event_id, palco_tier, nombre, email, price_cents, status, created_at
    `)

    const row = stmt.get({
      event_id,
      palco_tier,
      nombre,
      email,
      telefono_enc: telefonoEnc,
      price_cents: priceCents,
    }) as {
      id: string
      event_id: string
      palco_tier: string
      nombre: string
      email: string
      price_cents: number
      status: string
      created_at: number
    }

    return reply.code(201).send({
      reservation_id: row.id,
      event_id: row.event_id,
      event_title: event.title,
      palco_tier: row.palco_tier,
      nombre: row.nombre,
      email: row.email,
      price_cents: row.price_cents,
      status: row.status,
      message: `Reserva de Palco ${palco_tier.charAt(0).toUpperCase() + palco_tier.slice(1)} confirmada. El equipo de Skpat VIP se pondra en contacto contigo pronto.`,
    })
  })
}
