import { useState, type DragEvent } from 'react'
import { UploadCloud } from 'lucide-react'

interface FileDropzoneProps {
  label: string
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  disabled?: boolean
}

const IMAGE_ACCEPT = 'image/*'

function acceptedFiles(list: FileList | null, accept: string): File[] {
  const files = Array.from(list ?? [])
  return accept === IMAGE_ACCEPT ? files.filter((file) => file.type.startsWith('image/')) : files
}

/** Zona para arrastrar y soltar archivos, con selector clásico como alternativa accesible. */
export function FileDropzone({ label, onFiles, accept = IMAGE_ACCEPT, multiple = false, disabled = false }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false)

  const emit = (list: FileList | null) => {
    const files = acceptedFiles(list, accept)
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1))
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    if (!disabled) emit(event.dataTransfer.files)
  }

  return (
    <label
      onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      data-testid="file-dropzone"
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm transition-colors focus-within:border-skpat-oro ${
        dragging ? 'border-skpat-oro bg-skpat-oro/10' : 'border-skpat-border bg-skpat-bg3 hover:border-skpat-oro/60'
      } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <UploadCloud size={28} className="text-skpat-oro" aria-hidden="true" />
      <span className="font-semibold text-skpat-text">{label}</span>
      <span className="text-xs text-skpat-muted">Arrastra y suelta, o toca para elegir</span>
      <input
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => { emit(event.target.files); event.target.value = '' }}
      />
    </label>
  )
}
