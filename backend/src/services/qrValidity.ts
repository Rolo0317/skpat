const HOUR_MS = 60 * 60 * 1000
/** El QR sirve desde unas horas antes de abrir la puerta... */
const VALID_FROM_HOURS_BEFORE = 3
/** ...hasta el cierre del evento o, si no lo tiene, 12 h después del inicio (no hay límite de horario). */
const DEFAULT_DURATION_HOURS = 12

export type QrWindowStatus = 'valid' | 'NotYetValid' | 'Expired'

/** Regla 3 del contrato: cada QR vale solo para la fecha de su evento. */
export function qrWindowStatus(eventDate: Date, eventEndsAt: Date | null, now = new Date()): QrWindowStatus {
  const start = new Date(eventDate).getTime()
  const opensAt = start - VALID_FROM_HOURS_BEFORE * HOUR_MS
  const closesAt = eventEndsAt ? new Date(eventEndsAt).getTime() : start + DEFAULT_DURATION_HOURS * HOUR_MS
  if (now.getTime() < opensAt) return 'NotYetValid'
  if (now.getTime() > closesAt) return 'Expired'
  return 'valid'
}
