import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiErrors'

export const GALLERY_PATH = '/admin/gallery'

export type UploadStatus = 'pendiente' | 'subiendo' | 'lista' | 'error'

export interface QueuedPhoto {
  key: string
  file: File
  previewUrl: string
  caption: string
  status: UploadStatus
  error?: string
}

let queueSequence = 0

function toQueued(file: File): QueuedPhoto {
  queueSequence += 1
  return { key: `${queueSequence}-${file.name}`, file, previewUrl: URL.createObjectURL(file), caption: '', status: 'pendiente' }
}

function photoForm(photo: QueuedPhoto, eventId: string): FormData {
  const form = new FormData()
  form.append('file', photo.file)
  if (eventId) form.append('event_id', eventId)
  if (photo.caption.trim()) form.append('caption', photo.caption.trim())
  return form
}

/** Cola de fotos con vista previa; se suben una a una para mostrar progreso real y reintentar solo las fallidas. */
export function useGalleryUpload(onUploaded: () => void) {
  const [queue, setQueue] = useState<QueuedPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const queueRef = useRef(queue)
  queueRef.current = queue

  useEffect(() => () => queueRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)), [])

  const patch = (key: string, changes: Partial<QueuedPhoto>) =>
    setQueue((current) => current.map((photo) => (photo.key === key ? { ...photo, ...changes } : photo)))

  const add = (files: File[]) => setQueue((current) => [...current, ...files.map(toQueued)])

  const discard = (key: string) =>
    setQueue((current) => {
      const photo = current.find((item) => item.key === key)
      if (photo) URL.revokeObjectURL(photo.previewUrl)
      return current.filter((item) => item.key !== key)
    })

  const setCaption = (key: string, caption: string) => patch(key, { caption })

  const uploadAll = async (eventId: string) => {
    setUploading(true)
    for (const photo of queueRef.current.filter((item) => item.status !== 'lista')) {
      patch(photo.key, { status: 'subiendo', error: undefined })
      try {
        await api.post(GALLERY_PATH, photoForm(photo, eventId))
        patch(photo.key, { status: 'lista' })
      } catch (error) {
        patch(photo.key, { status: 'error', error: apiErrorMessage(error) })
      }
    }
    setUploading(false)
    onUploaded()
  }

  const clearUploaded = () => queueRef.current.filter((photo) => photo.status === 'lista').forEach((photo) => discard(photo.key))

  const done = queue.filter((photo) => photo.status === 'lista').length
  return { queue, uploading, done, total: queue.length, add, discard, setCaption, uploadAll, clearUploaded }
}
