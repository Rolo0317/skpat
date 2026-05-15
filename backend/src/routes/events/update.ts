import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'

const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  date: z.string().refine((v) => !Number.isNaN(Date.parse(v))).optional(),
  description: z.string().max(2000).nullable().optional(),
  price: z.number().int().nonnegative().optional(),
  available_spots: z.number().int().nonnegative().optional(),
  is_vip: z.number().int().min(0).max(1).optional(),
  is_active: z.number().int().min(0).max(1).optional(),
})

export async function updateEventRoute(app: FastifyInstance) {
  app.put<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [verifyAuth, requireRole('admin')] },
    async (req, reply) => {
      const parsed = updateSchema.safeParse(req.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', issues: parsed.error.issues })
      }
      const fields = parsed.data
      const keys = Object.keys(fields)
      if (keys.length === 0) {
        return reply.code(400).send({ error: 'NoFieldsToUpdate' })
      }
      const setClause = keys.map((k) => `${k} = @${k}`).join(', ')
      const stmt = db.prepare(
        `UPDATE events SET ${setClause} WHERE id = @id
         RETURNING id, title, date, description, price, image_url, available_spots, is_vip, is_active, created_at`
      )
      const row = stmt.get({ ...fields, id: req.params.id })
      if (!row) return reply.code(404).send({ error: 'EventNotFound' })
      return row
    }
  )
}
