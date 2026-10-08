import { api } from './api'
import type { ArchivoSubido } from './operacion'

export const UPLOADS_PATH = '/admin/uploads'
const FILE_FIELD = 'file'

/** Carpetas que acepta el almacenamiento del backend (`?carpeta=`). */
export type UploadFolder = 'flyers' | 'anuncios' | 'galeria'

/** Sube una imagen al almacenamiento único del backend y devuelve su URL pública. */
export function uploadFile(file: File, folder: UploadFolder): Promise<ArchivoSubido> {
  const form = new FormData()
  form.append(FILE_FIELD, file)
  return api.post<ArchivoSubido>(`${UPLOADS_PATH}?carpeta=${folder}`, form)
}
