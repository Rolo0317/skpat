const CENTS_PER_PESO = 100

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/** Formatea un valor en centavos como pesos colombianos (p. ej. 3000000 -> "$ 30.000"). */
export function formatCOP(cents: number): string {
  return copFormatter.format(cents / CENTS_PER_PESO)
}

const LOCALE = 'es-CO'
const MS_PER_MINUTE = 60_000
/** Longitud de 'YYYY-MM-DDTHH:mm', el valor que usa <input type="datetime-local">. */
const DATETIME_LOCAL_LENGTH = 16

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/** Fecha y hora cortas en español (p. ej. "sáb, 10 oct, 10:00 p. m."). */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso))
}

/** ISO 8601 -> valor de <input type="datetime-local"> en la hora local del navegador. */
export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * MS_PER_MINUTE).toISOString().slice(0, DATETIME_LOCAL_LENGTH)
}

/** Valor de <input type="datetime-local"> -> ISO 8601, o null si está vacío. */
export function fromDatetimeLocal(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

/** Pesos escritos por el admin -> centavos COP. */
export function pesosToCents(pesos: number): number {
  return Math.round(pesos * CENTS_PER_PESO)
}

/** Centavos COP -> pesos para editar en un formulario. */
export function centsToPesos(cents: number): number {
  return cents / CENTS_PER_PESO
}
