import type { FastifyRequest } from 'fastify'
import type { MultipartFile } from '@fastify/multipart'
import { HttpError } from './db/types.js'
import { MAX_IMAGE_MEGABYTES } from './storage/imageValidation.js'

/** Código de @fastify/multipart cuando un archivo supera `limits.fileSize`. */
const FILE_TOO_LARGE_CODE = 'FST_REQ_FILE_TOO_LARGE'

export type FormFields = Record<string, unknown>

export interface FormFile {
  fieldname: string
  datos: Buffer
}

export interface MultipartForm {
  fields: FormFields
  files: FormFile[]
}

/** Un campo repetido (p. ej. varios `lineup`) se acumula en un arreglo en vez de sobrescribirse. */
function addField(fields: FormFields, name: string, value: string): void {
  const previous = fields[name]
  if (previous === undefined) fields[name] = value
  else fields[name] = Array.isArray(previous) ? [...previous, value] : [previous, value]
}

async function readFile(part: MultipartFile): Promise<Buffer> {
  try {
    return await part.toBuffer()
  } catch (err) {
    if ((err as { code?: string }).code === FILE_TOO_LARGE_CODE) {
      throw new HttpError(413, 'FileTooLarge', { max_mb: MAX_IMAGE_MEGABYTES })
    }
    throw err
  }
}

/**
 * Lee un formulario multipart completo: campos de texto y archivos de `fileFields` en memoria
 * (los demás archivos se descartan). Así los campos pueden llegar antes o después de los archivos.
 */
export async function readMultipartForm(req: FastifyRequest, fileFields: readonly string[], maxFiles: number): Promise<MultipartForm> {
  const form: MultipartForm = { fields: {}, files: [] }
  for await (const part of req.parts()) {
    if (part.type === 'field') addField(form.fields, part.fieldname, String(part.value))
    else if (!fileFields.includes(part.fieldname)) part.file.resume()
    else if (form.files.length >= maxFiles) throw new HttpError(400, 'TooManyFiles', { max: maxFiles })
    else form.files.push({ fieldname: part.fieldname, datos: await readFile(part) })
  }
  return form
}

/** Exige un cuerpo multipart; responde 400 si llega JSON u otro formato. */
export function assertMultipart(req: FastifyRequest): void {
  if (!req.isMultipart()) throw new HttpError(400, 'MultipartRequired')
}
