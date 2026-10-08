/** Archivo ya guardado: `url` es pública y `pathname` es la llave para borrarlo. */
export interface StoredFile {
  url: string
  pathname: string
}

/**
 * Puerto de almacenamiento de archivos. Las rutas dependen de esta abstracción, nunca de un
 * proveedor concreto: Vercel Blob en producción, disco en local y memoria en pruebas.
 */
export interface StorageProvider {
  put(datos: Buffer, nombre: string, contentType: string): Promise<StoredFile>
  delete(pathname: string): Promise<void>
}
