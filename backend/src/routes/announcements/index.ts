import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db.js'
import { registerAdminCrud } from '../../lib/crudRoutes.js'
import { isoDateSchema, optionalTextSchema, publicUrlSchema } from '../../lib/schemas.js'

const ANNOUNCEMENT_PROJECTION = `id, titulo, cuerpo, image_url, cta_label, cta_url, event_id,
  starts_at, ends_at, activo, fijado, created_at`
const MAX_TITULO_LENGTH = 120
const MAX_CUERPO_LENGTH = 1000
const MAX_CTA_LABEL_LENGTH = 40

const announcementFields = {
  titulo: z.string().trim().min(1).max(MAX_TITULO_LENGTH),
  cuerpo: optionalTextSchema(MAX_CUERPO_LENGTH),
  image_url: publicUrlSchema.nullable(),
  cta_label: optionalTextSchema(MAX_CTA_LABEL_LENGTH),
  cta_url: publicUrlSchema.nullable(),
  event_id: z.string().uuid().nullable(),
  starts_at: isoDateSchema,
  ends_at: isoDateSchema.nullable(),
  activo: z.boolean(),
  fijado: z.boolean(),
}

const endsAfterStart = (input: { starts_at?: string; ends_at?: string | null }) =>
  !input.starts_at || !input.ends_at || Date.parse(input.ends_at) > Date.parse(input.starts_at)
const ENDS_AFTER_START = { message: 'ends_at must be after starts_at', path: ['ends_at'] }

const createAnnouncementSchema = z
  .object(announcementFields)
  .partial()
  .required({ titulo: true })
  .refine(endsAfterStart, ENDS_AFTER_START)

const updateAnnouncementSchema = z.object(announcementFields).partial().refine(endsAfterStart, ENDS_AFTER_START)

/** GET /announcements (público): vigentes ahora, fijados primero y luego los más recientes. */
export async function announcementsRoutes(app: FastifyInstance) {
  app.get('/', () =>
    db.many(
      `select ${ANNOUNCEMENT_PROJECTION} from announcements
        where activo and starts_at <= now() and (ends_at is null or ends_at > now())
        order by fijado desc, starts_at desc`,
    ),
  )
}

/** CRUD /admin/announcements: incluye anuncios vencidos, programados e inactivos. */
export async function announcementsAdminRoutes(app: FastifyInstance) {
  registerAdminCrud(app, {
    table: 'announcements',
    projection: ANNOUNCEMENT_PROJECTION,
    notFoundCode: 'AnnouncementNotFound',
    createSchema: createAnnouncementSchema,
    updateSchema: updateAnnouncementSchema,
    list: () => db.many(`select ${ANNOUNCEMENT_PROJECTION} from announcements order by created_at desc`),
  })
}
