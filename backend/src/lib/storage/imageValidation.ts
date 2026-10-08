import { HttpError } from '../db/types.js'

const BYTES_PER_MEGABYTE = 1024 * 1024
export const MAX_IMAGE_MEGABYTES = 8
export const MAX_IMAGE_BYTES = MAX_IMAGE_MEGABYTES * BYTES_PER_MEGABYTE

/** Carpetas permitidas: cada módulo guarda sus imágenes en la suya. */
export const STORAGE_FOLDERS = ['galeria', 'anuncios', 'flyers'] as const
export type StorageFolder = (typeof STORAGE_FOLDERS)[number]

interface ImageFormat {
  contentType: string
  extension: string
  matches: (datos: Buffer) => boolean
}

const startsWith = (datos: Buffer, signature: number[], offset = 0) =>
  signature.every((byte, index) => datos[offset + index] === byte)

const ASCII = (text: string) => [...text].map((char) => char.charCodeAt(0))
const WEBP_FORMAT_OFFSET = 8

/** Se identifica el formato por su firma binaria: el content-type que declara el cliente no es confiable. */
const IMAGE_FORMATS: ImageFormat[] = [
  { contentType: 'image/jpeg', extension: 'jpg', matches: (d) => startsWith(d, [0xff, 0xd8, 0xff]) },
  { contentType: 'image/png', extension: 'png', matches: (d) => startsWith(d, [0x89, ...ASCII('PNG')]) },
  { contentType: 'image/gif', extension: 'gif', matches: (d) => startsWith(d, ASCII('GIF8')) },
  {
    contentType: 'image/webp',
    extension: 'webp',
    matches: (d) => startsWith(d, ASCII('RIFF')) && startsWith(d, ASCII('WEBP'), WEBP_FORMAT_OFFSET),
  },
]

const EXTENSIONS = IMAGE_FORMATS.map((format) => format.extension).join('|')
/** Forma exacta de los nombres que genera el servidor: impide path traversal al borrar. */
const STORED_PATHNAME = new RegExp(`^(${STORAGE_FOLDERS.join('|')})/[0-9a-f-]{36}\.(${EXTENSIONS})$`)

export function isStoredPathname(pathname: string): boolean {
  return STORED_PATHNAME.test(pathname)
}

/** Única validación de imágenes subidas: tamaño máximo y formato jpeg/png/webp/gif. */
export function validateImage(datos: Buffer): Pick<ImageFormat, 'contentType' | 'extension'> {
  if (datos.length === 0) throw new HttpError(400, 'EmptyFile')
  if (datos.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'FileTooLarge', { max_mb: MAX_IMAGE_MEGABYTES })
  const format = IMAGE_FORMATS.find((candidate) => candidate.matches(datos))
  if (!format) throw new HttpError(415, 'UnsupportedImageType', { allowed: IMAGE_FORMATS.map((f) => f.contentType) })
  return { contentType: format.contentType, extension: format.extension }
}
