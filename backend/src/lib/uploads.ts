import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import type { Readable } from 'node:stream'

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads')
export const UPLOADS_URL_PREFIX = '/uploads/'
const UNKNOWN_EXTENSION = '.bin'

/** En Vercel el sistema de archivos es efímero y de solo lectura: las imágenes llegan como URL. */
export function isDiskUploadEnabled(): boolean {
  return !process.env.VERCEL
}

export function ensureUploadsDir(): void {
  if (!isDiskUploadEnabled()) return
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

/** El nombre lo genera el servidor; del original solo se conserva la extensión (evita path traversal). */
export async function saveUpload(file: Readable, originalName: string | undefined): Promise<string> {
  const filename = `${randomUUID()}${path.extname(originalName ?? '') || UNKNOWN_EXTENSION}`
  await pipeline(file, fs.createWriteStream(path.join(UPLOADS_DIR, filename)))
  return `${UPLOADS_URL_PREFIX}${filename}`
}
