import { qrWindowStatus } from '../../services/qrValidity.js'
import type { PublicListRow } from './listRepository.js'

export type ListAvailability = 'open' | 'ListClosed' | 'ListFull'

const isPast = (date: Date | null, now: Date) => date !== null && new Date(date).getTime() <= now.getTime()

/** Cerrada si está inactiva, pasó su cierre, o su evento está inactivo o ya terminó (QR vencido). */
function isClosed(list: PublicListRow, now: Date): boolean {
  return !list.activa
    || isPast(list.cierra_at, now)
    || !list.event_active
    || qrWindowStatus(list.event_date, list.event_ends_at, now) === 'Expired'
}

const isFull = (list: PublicListRow) => list.cupo !== null && list.inscritos >= list.cupo

/** Abierta = activa, sin cerrar, con cupo, y con su evento activo y sin vencer. */
export function listAvailability(list: PublicListRow, now = new Date()): ListAvailability {
  if (isClosed(list, now)) return 'ListClosed'
  if (isFull(list)) return 'ListFull'
  return 'open'
}
