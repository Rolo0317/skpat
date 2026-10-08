import { del, put } from '@vercel/blob'
import type { StorageProvider, StoredFile } from './types.js'

/** Producción en Vercel: archivos públicos en Vercel Blob (el token llega por BLOB_READ_WRITE_TOKEN). */
export class VercelBlobStorage implements StorageProvider {
  constructor(private readonly token: string) {}

  async put(datos: Buffer, nombre: string, contentType: string): Promise<StoredFile> {
    const blob = await put(nombre, datos, { access: 'public', contentType, token: this.token })
    return { url: blob.url, pathname: blob.pathname }
  }

  delete(pathname: string): Promise<void> {
    return del(pathname, { token: this.token })
  }
}
