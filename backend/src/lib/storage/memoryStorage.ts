import type { StorageProvider, StoredFile } from './types.js'

/** URL absoluta https: pasa las mismas validaciones de URL que una de Vercel Blob. */
const MEMORY_URL_PREFIX = 'https://memoria.skpat.test/'

/** Almacenamiento en memoria para pruebas: permite verificar qué se guardó y qué se borró. */
export class MemoryStorage implements StorageProvider {
  readonly files = new Map<string, { datos: Buffer; contentType: string }>()

  async put(datos: Buffer, nombre: string, contentType: string): Promise<StoredFile> {
    this.files.set(nombre, { datos, contentType })
    return { url: `${MEMORY_URL_PREFIX}${nombre}`, pathname: nombre }
  }

  async delete(pathname: string): Promise<void> {
    this.files.delete(pathname)
  }
}
