import { deleteUpload, writeUpload } from '../uploads.js'
import type { StorageProvider, StoredFile } from './types.js'

/** Desarrollo local: guarda en backend/uploads y Fastify lo sirve en /uploads/. */
export class DiskStorage implements StorageProvider {
  async put(datos: Buffer, nombre: string): Promise<StoredFile> {
    return { url: await writeUpload(datos, nombre), pathname: nombre }
  }

  delete(pathname: string): Promise<void> {
    return deleteUpload(pathname)
  }
}
