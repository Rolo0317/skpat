import type { SkpatEvent } from '@/features/landing/types'
import { centsToPesos, fromDatetimeLocal, pesosToCents, toDatetimeLocal } from '@/lib/format'

const DEFAULT_AVAILABLE_SPOTS = '100'
const LINEUP_SEPARATOR = ','

export interface EventFormValues {
  title: string
  date: string
  ends_at: string
  description: string
  /** Precio de taquilla en pesos (se usa cuando no hay etapa vigente). */
  price_pesos: string
  available_spots: string
  is_vip: boolean
  promoter_id: string
  lineup: string
  image_url: string | null
}

/** Cuerpo JSON de POST/PUT /events (montos en centavos, fechas ISO). */
export interface EventPayload {
  title: string
  date: string
  ends_at: string | null
  description: string | null
  price: number
  available_spots: number
  is_vip: boolean
  promoter_id: string | null
  lineup: string[]
  image_url: string | null
}

export const EMPTY_EVENT_FORM: EventFormValues = {
  title: '', date: '', ends_at: '', description: '', price_pesos: '', available_spots: DEFAULT_AVAILABLE_SPOTS,
  is_vip: false, promoter_id: '', lineup: '', image_url: null,
}

export function eventToForm(event: SkpatEvent): EventFormValues {
  return {
    title: event.title,
    date: toDatetimeLocal(event.date),
    ends_at: toDatetimeLocal(event.ends_at),
    description: event.description ?? '',
    price_pesos: String(centsToPesos(event.price)),
    available_spots: String(event.available_spots),
    is_vip: event.is_vip === 1,
    promoter_id: event.promoter_id ?? '',
    lineup: (event.lineup ?? []).join(`${LINEUP_SEPARATOR} `),
    image_url: event.image_url,
  }
}

export function eventFormToPayload(values: EventFormValues): EventPayload {
  return {
    title: values.title.trim(),
    date: fromDatetimeLocal(values.date) ?? '',
    ends_at: fromDatetimeLocal(values.ends_at),
    description: values.description.trim() || null,
    price: pesosToCents(Number(values.price_pesos || 0)),
    available_spots: Number(values.available_spots),
    is_vip: values.is_vip,
    promoter_id: values.promoter_id || null,
    lineup: values.lineup.split(LINEUP_SEPARATOR).map((artist) => artist.trim()).filter(Boolean),
    image_url: values.image_url,
  }
}
