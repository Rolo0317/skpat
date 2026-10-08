import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { HttpError } from '../../lib/db.js'
import { assertMultipart, readMultipartForm } from '../../lib/multipartForm.js'
import { parseOrThrow } from '../../lib/schemas.js'
import { STORAGE_FOLDERS, storeImage } from '../../lib/storage/index.js'
import { adminOnly } from '../../plugins/auth.js'

const FILE_FIELD = 'file'
const MAX_FILES = 1
const DEFAULT_FOLDER = 'anuncios'

const uploadQuerySchema = z.object({ carpeta: z.enum(STORAGE_FOLDERS).default(DEFAULT_FOLDER) })

/** POST /admin/uploads (multipart `file`, `?carpeta=galeria|anuncios|flyers`) → { url, pathname }. */
export async function uploadsAdminRoutes(app: FastifyInstance) {
  app.post('/', adminOnly, async (req, reply) => {
    assertMultipart(req)
    const { carpeta } = parseOrThrow(uploadQuerySchema, req.query)
    const { files } = await readMultipartForm(req, [FILE_FIELD], MAX_FILES)
    const [file] = files
    if (!file) throw new HttpError(400, 'FileRequired')
    return reply.code(201).send(await storeImage(file.datos, carpeta))
  })
}
