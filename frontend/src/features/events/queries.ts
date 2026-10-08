import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { OfertaEvento } from '@/lib/operacion'
import type { SkpatEvent } from '@/features/landing/types'

export const EVENTS_PATH = '/events'
export const EVENTS_QUERY_KEY = [EVENTS_PATH]

export const eventOfferPath = (eventId: string) => `${EVENTS_PATH}/${eventId}/oferta`

/** Eventos activos, compartidos por todas las pantallas. */
export function useEvents() {
  const query = useQuery({ queryKey: EVENTS_QUERY_KEY, queryFn: () => api.get<SkpatEvent[]>(EVENTS_PATH) })
  return { ...query, events: query.data ?? [] }
}

/** Etapas, precio vigente y ofertas de palco/mesa de un evento. */
export function useEventOffer(eventId: string | undefined) {
  return useQuery({
    queryKey: [eventOfferPath(eventId ?? '')],
    queryFn: () => api.get<OfertaEvento>(eventOfferPath(eventId!)),
    enabled: Boolean(eventId),
  })
}
