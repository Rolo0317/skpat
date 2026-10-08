/** Bogotá no tiene horario de verano: el desfase con UTC es fijo. */
const BOGOTA_UTC_OFFSET = '-05:00'
const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000
const MS_PER_DAY = 24 * 60 * 60 * 1000
const FRIDAY = 5
const SATURDAY = 6
const PARTY_START_TIME = '22:00:00'

export const MS_PER_MINUTE = 60 * 1000

const isWeekendNight = (day: Date) => day.getUTCDay() === FRIDAY || day.getUTCDay() === SATURDAY

/** Medianoche del día calendario de Bogotá, representada en UTC para usar getters UTC sin ambigüedad. */
function bogotaCalendarDay(instant: Date): Date {
  const shifted = new Date(instant.getTime() + BOGOTA_OFFSET_MS)
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()))
}

const partyStartOn = (day: Date) => new Date(`${day.toISOString().slice(0, 10)}T${PARTY_START_TIME}${BOGOTA_UTC_OFFSET}`)

/**
 * Noches de viernes/sábado a las 22:00 hora Bogotá, recorriendo el calendario hacia el futuro
 * (`step` = 1) o hacia el pasado (`step` = -1). Solo incluye noches estrictamente en esa dirección.
 */
function weekendNights(count: number, step: 1 | -1, now: Date): Date[] {
  const nights: Date[] = []
  for (let day = bogotaCalendarDay(now); nights.length < count; day = new Date(day.getTime() + step * MS_PER_DAY)) {
    const start = partyStartOn(day)
    const inDirection = step === 1 ? start > now : start < now
    if (isWeekendNight(day) && inDirection) nights.push(start)
  }
  return nights
}

export const upcomingWeekendNights = (count: number, now = new Date()) => weekendNights(count, 1, now)
export const pastWeekendNights = (count: number, now = new Date()) => weekendNights(count, -1, now)
