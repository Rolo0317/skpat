import type { FastifyRequest } from 'fastify'
import type { MultipartFile } from '@fastify/multipart'
import { HttpError } from '../../lib/db.js'
import { isDiskUploadEnabled, saveUpload } from '../../lib/uploads.js'

const IMAGE_FIELD = 'image'

type BodyFields = Record<string, unknown>

/** Un campo repetido (p. ej. varios `lineup`) se acumula en un arreglo en vez de sobrescribirse. */
function addField(fields: BodyFields, name: string, value: string): void {
  const previous = fields[name]
  if (previous === undefined) fields[name] = value
  else fields[name] = Array.isArray(previous) ? [...previous, value] : [previous, value]
}

async function storeImage(part: MultipartFile): Promise<string> {
  if (!isDiskUploadEnabled()) {
    part.file.resume()
    throw new HttpError(400, 'ImageUploadUnavailable', { message: 'Send image_url instead of a file' })
  }
  return saveUpload(part.file, part.filename)
}

async function readMultipart(req: FastifyRequest): Promise<BodyFields> {
  const fields: BodyFields = {}
  for await (const part of req.parts()) {
    if (part.type === 'field') addField(fields, part.fieldname, String(part.value))
    else if (part.fieldname === IMAGE_FIELD) fields.image_url = await storeImage(part)
    else part.file.resume()
  }
  return fields
}

/**
 * Normaliza el cuerpo de crear/editar evento: acepta JSON (con `image_url`) o multipart
 * (con archivo `image`, guardado en disco solo fuera de Vercel).
 */
export async function readEventBody(req: FastifyRequest): Promise<unknown> {
  return req.isMultipart() ? readMultipart(req) : req.body
}
