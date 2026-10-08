import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, X } from 'lucide-react'
import { api, apiAssetUrl } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiErrors'
import type { FotoGaleria } from '@/lib/operacion'
import { PageHeader } from '@/components/ui/PageHeader'
import { FileDropzone } from '@/components/ui/FileDropzone'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { ConfirmDeleteButton } from '@/components/ui/ConfirmDeleteButton'
import { cardClass, inputClass } from '@/components/ui/styles'
import { EventSelect } from '../components/EntitySelects'
import { GALLERY_PATH, useGalleryUpload, type QueuedPhoto, type UploadStatus } from './useGalleryUpload'

const GALLERY_QUERY_KEY = [GALLERY_PATH]
const PERCENT = 100

const STATUS_LABELS: Record<UploadStatus, string> = {
  pendiente: 'En cola',
  subiendo: 'Subiendo…',
  lista: 'Subida',
  error: 'Falló',
}

function QueuedPhotoCard({ photo, disabled, onCaption, onDiscard }: {
  photo: QueuedPhoto
  disabled: boolean
  onCaption: (caption: string) => void
  onDiscard: () => void
}) {
  return (
    <li className="overflow-hidden rounded-lg border border-skpat-border bg-skpat-bg3">
      <div className="relative">
        <img src={photo.previewUrl} alt={`Vista previa de ${photo.file.name}`} className="aspect-square w-full object-cover" />
        <span className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${photo.status === 'error' ? 'bg-skpat-red text-white' : 'bg-skpat-oro text-skpat-bg'}`}>
          {STATUS_LABELS[photo.status]}
        </span>
        {!disabled && photo.status !== 'lista' && (
          <button type="button" onClick={onDiscard} aria-label={`Quitar ${photo.file.name}`}
            className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white hover:bg-black">
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <input className={`${inputClass} rounded-none border-0 border-t`} placeholder="Pie de foto (opcional)" aria-label={`Pie de foto de ${photo.file.name}`}
        value={photo.caption} disabled={disabled || photo.status === 'lista'} onChange={(e) => onCaption(e.target.value)} maxLength={200} />
      {photo.error && <p className="px-2 py-1 text-xs text-red-300">{photo.error}</p>}
    </li>
  )
}

export default function AdminGalleryPage() {
  const queryClient = useQueryClient()
  const [eventId, setEventId] = useState('')
  const [filter, setFilter] = useState('')
  const refreshGallery = () => queryClient.invalidateQueries({ queryKey: GALLERY_QUERY_KEY })
  const upload = useGalleryUpload(refreshGallery)
  const { data: photos = [], isLoading, error } = useQuery({ queryKey: GALLERY_QUERY_KEY, queryFn: () => api.get<FotoGaleria[]>(GALLERY_PATH) })
  const remove = useMutation({ mutationFn: (id: string) => api.del(`${GALLERY_PATH}/${id}`), onSuccess: refreshGallery })

  const pending = upload.total - upload.done
  const progress = upload.total ? Math.round((upload.done / upload.total) * PERCENT) : 0
  const visible = filter ? photos.filter((photo) => photo.event_id === filter) : photos

  return (
    <section className="mx-auto max-w-6xl p-4 sm:p-6">
      <PageHeader title="Galería" description="Fotos de las noches de Skpat. Aparecen en la web, las más recientes primero." />

      <div className={`${cardClass} mb-8 space-y-4`}>
        <FileDropzone label="Agregar fotos" multiple onFiles={upload.add} disabled={upload.uploading} />
        {upload.total > 0 && (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {upload.queue.map((photo) => (
                <QueuedPhotoCard key={photo.key} photo={photo} disabled={upload.uploading}
                  onCaption={(caption) => upload.setCaption(photo.key, caption)} onDiscard={() => upload.discard(photo.key)} />
              ))}
            </ul>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <EventSelect label="Evento de las fotos" value={eventId} onChange={setEventId} emptyLabel="Sin evento" />
              <div className="flex gap-2">
                {upload.done > 0 && !upload.uploading && <Button variant="ghost" onClick={upload.clearUploaded}>Limpiar subidas</Button>}
                <Button onClick={() => upload.uploadAll(eventId)} disabled={upload.uploading || pending === 0}>
                  <Upload size={16} aria-hidden="true" /> {upload.uploading ? 'Subiendo…' : `Subir ${pending} foto${pending === 1 ? '' : 's'}`}
                </Button>
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-skpat-muted">
                <span>Progreso</span><span>{upload.done} de {upload.total}</span>
              </div>
              <div role="progressbar" aria-label="Progreso de subida" aria-valuemin={0} aria-valuemax={upload.total} aria-valuenow={upload.done}
                className="h-2 overflow-hidden rounded-full bg-skpat-bg3">
                <div className="h-full bg-skpat-oro transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mb-4 max-w-sm">
        <EventSelect label="Filtrar por evento" value={filter} onChange={setFilter} emptyLabel="Todas las fotos" />
      </div>
      {error && <Alert>{apiErrorMessage(error)}</Alert>}
      {isLoading && <p className="text-skpat-muted">Cargando…</p>}
      {!isLoading && visible.length === 0 && <p className="py-6 text-center text-sm text-skpat-muted">Aún no hay fotos.</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((photo) => (
          <li key={photo.id} className="overflow-hidden rounded-lg border border-skpat-border bg-skpat-card">
            <img src={apiAssetUrl(photo.url)} alt={photo.caption ?? `Foto de ${photo.event_title ?? 'Skpat VIP'}`} loading="lazy" className="aspect-square w-full object-cover" />
            <div className="flex items-start justify-between gap-2 p-2">
              <div className="min-w-0 text-xs">
                <p className="truncate text-skpat-text">{photo.caption ?? 'Sin pie de foto'}</p>
                <p className="truncate text-skpat-muted">{photo.event_title ?? 'Sin evento'}</p>
              </div>
              <ConfirmDeleteButton itemName="esta foto" onConfirm={() => remove.mutateAsync(photo.id)} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
