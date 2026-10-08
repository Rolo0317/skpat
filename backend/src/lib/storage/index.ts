import { randomUUID } from 'node:crypto'
import { env } from '../env.js'
import { HttpError } from '../db/types.js'
import { isDiskUploadEnabled } from '../uploads.js'
import { isStoredPathname, validateImage, type StorageFolder } from './imageValidation.js'
import type { StorageProvider, StoredFile } from './types.js'

export type { StorageProvider, StoredFile } from './types.js'
export { MAX_IMAGE_BYTES, STORAGE_FOLDERS, isStoredPathname, type StorageFolder } from './imageValidation.js'

let override: StorageProvider | null | undefined
let selected: Promise<StorageProvider | null> | undefined

/** Elige el proveedor según el entorno: Vercel Blob si hay token, memoria en pruebas, disco fuera de Vercel. */
async function selectProvider(): Promise<StorageProvider | null> {
  if (env.BLOB_READ_WRITE_TOKEN) {
    const { VercelBlobStorage } = await import('./vercelBlobStorage.js')
    return new VercelBlobStorage(env.BLOB_READ_WRITE_TOKEN)
  }
  if (env.NODE_ENV === 'test') {
    const { MemoryStorage } = await import('./memoryStorage.js')
    return new MemoryStorage()
  }
  if (!isDiskUploadEnabled()) return null
  const { DiskStorage } = await import('./diskStorage.js')
  return new DiskStorage()
}

/** Pruebas: fija un proveedor (o `null` = sin almacenamiento); `undefined` vuelve a la selección automática. */
export function setStorageProvider(provider: StorageProvider | null | undefined): void {
  override = provider
}

async function getStorage(): Promise<StorageProvider> {
  selected ??= selectProvider()
  const provider = override !== undefined ? override : await selected
  if (!provider) throw new HttpError(503, 'ImageUploadUnavailable', { message: 'Configure BLOB_READ_WRITE_TOKEN or send image_url' })
  return provider
}

/** Valida y guarda una imagen con nombre generado por el servidor (del original no se usa nada). */
export async function storeImage(datos: Buffer, carpeta: StorageFolder): Promise<StoredFile> {
  const { contentType, extension } = validateImage(datos)
  const storage = await getStorage()
  return storage.put(datos, `${carpeta}/${randomUUID()}.${extension}`, contentType)
}

/**
 * Guarda varias imágenes como una sola operación: valida todas antes de subir y, si alguna
 * subida falla, borra las que ya quedaron guardadas.
 */
export async function storeImages(archivos: Buffer[], carpeta: StorageFolder): Promise<StoredFile[]> {
  archivos.forEach(validateImage)
  const stored: StoredFile[] = []
  try {
    for (const datos of archivos) stored.push(await storeImage(datos, carpeta))
    return stored
  } catch (err) {
    await deleteStoredImages(stored)
    throw err
  }
}

/** Borra un archivo guardado por `storeImage`; ignora llaves ajenas (p. ej. URLs externas). */
export async function deleteStoredImage(pathname: string): Promise<void> {
  if (!isStoredPathname(pathname)) return
  const storage = await getStorage()
  await storage.delete(pathname)
}

/** Limpieza de mejor esfuerzo: un fallo al borrar no oculta el error original. */
export async function deleteStoredImages(files: StoredFile[]): Promise<void> {
  await Promise.allSettled(files.map((file) => deleteStoredImage(file.pathname)))
}
