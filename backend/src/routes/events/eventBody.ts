import type { FastifyRequest } from 'fastify'
import { readMultipartForm } from '../../lib/multipartForm.js'
import { storeImage } from '../../lib/storage/index.js'

const IMAGE_FIELD = 'image'
const MAX_IMAGES = 1

async function readMultipart(req: FastifyRequest): Promise<unknown> {
  const { fields, files } = await readMultipartForm(req, [IMAGE_FIELD], MAX_IMAGES)
  const [flyer] = files
  if (flyer) fields.image_url = (await storeImage(flyer.datos, 'flyers')).url
  return fields
}

/**
 * Normaliza el cuerpo de crear/editar evento: acepta JSON (con `image_url`) o multipart
 * (con archivo `image`, guardado en el almacenamiento configurado: Vercel Blob o disco).
 */
export async function readEventBody(req: FastifyRequest): Promise<unknown> {
  return req.isMultipart() ? readMultipart(req) : req.body
}
