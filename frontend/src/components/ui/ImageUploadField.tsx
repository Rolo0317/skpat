import { useState } from 'react'
import { X } from 'lucide-react'
import { apiAssetUrl } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiErrors'
import { uploadFile, type UploadFolder } from '@/lib/uploads'
import { FileDropzone } from './FileDropzone'
import { Button } from './Button'
import { labelClass } from './styles'

interface ImageUploadFieldProps {
  label: string
  folder: UploadFolder
  value: string | null
  onChange: (url: string | null) => void
}

/** Imagen única (flyer, anuncio) subida por /admin/uploads; el formulario solo guarda la URL. */
export function ImageUploadField({ label, folder, value, onChange }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async ([file]: File[]) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      onChange((await uploadFile(file, folder)).url)
    } catch (uploadError) {
      setError(apiErrorMessage(uploadError))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <span className={labelClass}>{label}</span>
      {value ? (
        <div className="relative w-fit">
          <img src={apiAssetUrl(value)} alt={`Vista previa: ${label}`} className="h-32 rounded-lg border border-skpat-border object-cover" />
          <Button variant="danger" className="absolute right-1 top-1 !min-h-8 !px-2" onClick={() => onChange(null)} aria-label={`Quitar ${label}`}>
            <X size={14} aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <FileDropzone label={uploading ? 'Subiendo…' : `Subir ${label.toLowerCase()}`} onFiles={upload} disabled={uploading} />
      )}
      {error && <p role="alert" className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  )
}
