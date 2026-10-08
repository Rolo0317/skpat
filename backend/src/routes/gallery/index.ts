import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db, HttpError } from '../../lib/db.js'
import { requireUuid } from '../../lib/ids.js'
import { assertMultipart, readMultipartForm } from '../../lib/multipartForm.js'
import { optionalTextSchema, parseOrThrow } from '../../lib/schemas.js'
import { deleteStoredImage, deleteStoredImages, storeImages, type StoredFile } from '../../lib/storage/index.js'
import { adminOnly } from '../../plugins/auth.js'

const FILE_FIELD = 'file'
const MAX_FILES_PER_UPLOAD = 20
const MAX_CAPTION_LENGTH = 200
const MAX_PHOTOS_LISTED = 500
const PUBLIC_PROJECTION = 'ph.id, ph.url, ph.caption, ph.event_id, e.title as event_title, ph.created_at'
const ADMIN_PROJECTION = `${PUBLIC_PROJECTION}, ph.pathname, ph.sort_order`

const galleryQuerySchema = z.object({ event_id: z.string().uuid().optional() })
const photoFieldsSchema = z.object({
  event_id: z.string().uuid().optional(),
  caption: optionalTextSchema(MAX_CAPTION_LENGTH).optional(),
})

/** Más recientes primero; opcionalmente solo las de un evento. */
function listPhotos(eventId: string | undefined, projection: string) {
  return db.many(
    `select ${projection}
       from event_photos ph left join events e on e.id = ph.event_id
      where ($1::uuid is null or ph.event_id = $1)
      order by ph.created_at desc, ph.sort_order asc
      limit ${MAX_PHOTOS_LISTED}`,
    [eventId ?? null],
  )
}

async function assertEventExists(eventId: string | undefined): Promise<void> {
  if (!eventId) return
  const event = await db.one('select 1 from events where id = $1', [eventId])
  if (!event) throw new HttpError(404, 'EventNotFound')
}

/** Si falla el registro en la base, se borran los archivos ya subidos para no dejar huérfanos. */
async function insertPhotos(stored: StoredFile[], fields: z.infer<typeof photoFieldsSchema>) {
  try {
    return await db.transaction(async (tx) => {
      const ids: string[] = []
      for (const [sortOrder, file] of stored.entries()) {
        const row = await tx.one<{ id: string }>(
          `insert into event_photos (event_id, url, pathname, caption, sort_order)
           values ($1, $2, $3, $4, $5) returning id`,
          [fields.event_id ?? null, file.url, file.pathname, fields.caption ?? null, sortOrder],
        )
        ids.push(row!.id)
      }
      return tx.many(
        `select ${ADMIN_PROJECTION} from event_photos ph left join events e on e.id = ph.event_id
          where ph.id = any($1) order by ph.sort_order`,
        [ids],
      )
    })
  } catch (err) {
    await deleteStoredImages(stored)
    throw err
  }
}

/** GET /gallery?event_id= (público). */
export async function galleryRoutes(app: FastifyInstance) {
  app.get('/', async (req) => {
    const { event_id } = parseOrThrow(galleryQuerySchema, req.query)
    return listPhotos(event_id, PUBLIC_PROJECTION)
  })
}

/** /admin/gallery: listar, subir varias fotos (multipart `file` + `event_id?` + `caption?`) y borrar. */
export async function galleryAdminRoutes(app: FastifyInstance) {
  app.get('/', adminOnly, async (req) => {
    const { event_id } = parseOrThrow(galleryQuerySchema, req.query)
    return listPhotos(event_id, ADMIN_PROJECTION)
  })

  app.post('/', adminOnly, async (req, reply) => {
    assertMultipart(req)
    const { fields, files } = await readMultipartForm(req, [FILE_FIELD], MAX_FILES_PER_UPLOAD)
    const input = parseOrThrow(photoFieldsSchema, fields)
    if (files.length === 0) throw new HttpError(400, 'FileRequired')
    await assertEventExists(input.event_id)
    const stored = await storeImages(files.map((file) => file.datos), 'galeria')
    return reply.code(201).send(await insertPhotos(stored, input))
  })

  app.delete<{ Params: { id: string } }>('/:id', adminOnly, async (req) => {
    const id = requireUuid(req.params.id, 'PhotoNotFound')
    const photo = await db.one<{ pathname: string }>('delete from event_photos where id = $1 returning pathname', [id])
    if (!photo) throw new HttpError(404, 'PhotoNotFound')
    await deleteStoredImage(photo.pathname)
    return { ok: true }
  })
}
