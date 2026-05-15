import type { FastifyInstance } from 'fastify'
import { pipeline } from 'node:stream/promises'
import { createWriteStream } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { UPLOADS_DIR } from '../../lib/uploads.js'

const eventSchema = z.object({
  title: z.string().min(3).max(200),
  date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid ISO date'),
  description: z.string().max(2000).optional().nullable(),
  price: z.coerce.number().int().nonnegative(),
  available_spots: z.coerce.number().int().nonnegative().default(100),
  is_vip: z.coerce.number().int().min(0).max(1).default(0),
})

export async function createEventRoute(app: FastifyInstance) {
  app.post(
    '/',
    { preHandler: [verifyAuth, requireRole('admin')] },
    async (req, reply) => {
      const fields: Record<string, string> = {}
      let imageUrl: string | null = null

      const parts = req.parts()
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'image') {
          const ext = path.extname(part.filename ?? '') || '.bin'
          const filename = `${randomUUID()}${ext}`
          const uploadPath = path.join(UPLOADS_DIR, filename)
          await pipeline(part.file, createWriteStream(uploadPath))
          imageUrl = `/uploads/${filename}`
        } else if (part.type === 'field') {
          fields[part.fieldname] = String(part.value)
        }
      }

      const parsed = eventSchema.safeParse(fields)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues })
      }
      const data = parsed.data

      const stmt = db.prepare(
        `INSERT INTO events (title, date, description, price, image_url, available_spots, is_vip)
         VALUES (@title, @date, @description, @price, @image_url, @available_spots, @is_vip)
         RETURNING id, title, date, description, price, image_url, available_spots, is_vip, is_active, created_at`
      )
      const row = stmt.get({
        title: data.title,
        date: data.date,
        description: data.description ?? null,
        price: data.price,
        image_url: imageUrl,
        available_spots: data.available_spots,
        is_vip: data.is_vip,
      })

      return reply.code(201).send(row)
    }
  )
}
