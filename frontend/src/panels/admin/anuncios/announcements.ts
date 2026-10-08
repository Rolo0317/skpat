import type { Anuncio } from '@/lib/operacion'
import { fromDatetimeLocal, toDatetimeLocal } from '@/lib/format'
import { useAdminResource } from '../hooks/useAdminResource'

export const ANNOUNCEMENTS_PATH = '/admin/announcements'

/** Sin `starts_at`, el backend publica desde ahora (default now()). */
export type AnuncioInput = Omit<Anuncio, 'id' | 'starts_at'> & { starts_at?: string }

export interface AnuncioFormValues {
  titulo: string
  cuerpo: string
  image_url: string | null
  cta_label: string
  cta_url: string
  event_id: string
  starts_at: string
  ends_at: string
  activo: boolean
  fijado: boolean
}

export const EMPTY_ANNOUNCEMENT_FORM: AnuncioFormValues = {
  titulo: '', cuerpo: '', image_url: null, cta_label: '', cta_url: '', event_id: '',
  starts_at: '', ends_at: '', activo: true, fijado: false,
}

export type Vigencia = 'programado' | 'vigente' | 'vencido' | 'inactivo'

export const VIGENCIA_LABELS: Record<Vigencia, string> = {
  programado: 'Programado',
  vigente: 'Visible ahora',
  vencido: 'Vencido',
  inactivo: 'Inactivo',
}

export function useAnnouncements() {
  return useAdminResource<Anuncio, AnuncioInput>(ANNOUNCEMENTS_PATH)
}

/** Misma regla que GET /announcements: starts_at <= ahora < ends_at (o sin fin). */
export function vigenciaOf(anuncio: Anuncio, now: Date = new Date()): Vigencia {
  if (!anuncio.activo) return 'inactivo'
  if (new Date(anuncio.starts_at) > now) return 'programado'
  if (anuncio.ends_at && new Date(anuncio.ends_at) <= now) return 'vencido'
  return 'vigente'
}

const orNull = (text: string) => text.trim() || null

export function announcementToForm(anuncio: Anuncio): AnuncioFormValues {
  return {
    titulo: anuncio.titulo,
    cuerpo: anuncio.cuerpo ?? '',
    image_url: anuncio.image_url,
    cta_label: anuncio.cta_label ?? '',
    cta_url: anuncio.cta_url ?? '',
    event_id: anuncio.event_id ?? '',
    starts_at: toDatetimeLocal(anuncio.starts_at),
    ends_at: toDatetimeLocal(anuncio.ends_at),
    activo: anuncio.activo,
    fijado: anuncio.fijado,
  }
}

/** Inicio vacío = desde ya (el backend usa now()). */
export function announcementFormToInput(values: AnuncioFormValues): AnuncioInput {
  const startsAt = fromDatetimeLocal(values.starts_at)
  return {
    titulo: values.titulo.trim(),
    cuerpo: orNull(values.cuerpo),
    image_url: values.image_url,
    cta_label: orNull(values.cta_label),
    cta_url: orNull(values.cta_url),
    event_id: values.event_id || null,
    ...(startsAt ? { starts_at: startsAt } : {}),
    ends_at: fromDatetimeLocal(values.ends_at),
    activo: values.activo,
    fijado: values.fijado,
  }
}
