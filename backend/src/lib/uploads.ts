import path from 'node:path'
import fs from 'node:fs/promises'
import { mkdirSync } from 'node:fs'

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads')
export const UPLOADS_URL_PREFIX = '/uploads/'

/** En Vercel el sistema de archivos es efímero y de solo lectura: ahí se usa Vercel Blob. */
export function isDiskUploadEnabled(): boolean {
  return !process.env.VERCEL
}

export function ensureUploadsDir(): void {
  if (!isDiskUploadEnabled()) return
  mkdirSync(UPLOADS_DIR, { recursive: true })
}

/** `pathname` lo genera el servidor (carpeta/uuid.ext), nunca el cliente: no hay path traversal. */
export async function writeUpload(datos: Buffer, pathname: string): Promise<string> {
  const destination = path.join(UPLOADS_DIR, pathname)
  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.writeFile(destination, datos)
  return `${UPLOADS_URL_PREFIX}${pathname}`
}

export async function deleteUpload(pathname: string): Promise<void> {
  await fs.rm(path.join(UPLOADS_DIR, pathname), { force: true })
}
