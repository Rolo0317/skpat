import { db } from '../lib/db.js'

/**
 * Reloj de negocio de la discoteca. Todo se calcula en Postgres con la zona de Bogotá para que
 * producción y pruebas coincidan sin depender de la zona horaria del servidor.
 * Las expresiones son constantes (sin datos del usuario), por eso es seguro interpolarlas en SQL.
 */
export const BUSINESS_TIME_ZONE = 'America/Bogota'

/** La noche de discoteca arranca a las 18:00 y se extiende hasta la madrugada siguiente. */
const NIGHT_START_HOUR = 18
const DAYS_BEFORE_TODAY_IN_WEEK = 6

const LOCAL_NOW = `(now() at time zone '${BUSINESS_TIME_ZONE}')`
const toBusinessInstant = (localTimestamp: string) => `((${localTimestamp}) at time zone '${BUSINESS_TIME_ZONE}')`

/** Inicio de la noche operativa más reciente: las últimas 18:00 de Bogotá que ya pasaron. */
export const NIGHT_START_SQL = toBusinessInstant(
  `date_trunc('day', ${LOCAL_NOW} - interval '${NIGHT_START_HOUR} hours') + interval '${NIGHT_START_HOUR} hours'`,
)

/** Medianoche de hoy en Bogotá. */
export const DAY_START_SQL = toBusinessInstant(`date_trunc('day', ${LOCAL_NOW})`)

const WEEK_START_SQL = toBusinessInstant(`date_trunc('day', ${LOCAL_NOW}) - interval '${DAYS_BEFORE_TODAY_IN_WEEK} days'`)
const MONTH_START_SQL = toBusinessInstant(`date_trunc('month', ${LOCAL_NOW})`)
const BEGINNING_OF_TIME_SQL = `'epoch'::timestamptz`

export const BUSINESS_PERIODS = {
  tonight: NIGHT_START_SQL,
  today: DAY_START_SQL,
  week: WEEK_START_SQL,
  month: MONTH_START_SQL,
  all: BEGINNING_OF_TIME_SQL,
} as const

export type BusinessPeriod = keyof typeof BUSINESS_PERIODS
export const BUSINESS_PERIOD_NAMES = Object.keys(BUSINESS_PERIODS) as [BusinessPeriod, ...BusinessPeriod[]]

/** Instante en que empieza el periodo, calculado por Postgres en hora de Bogotá. */
export async function periodStart(period: BusinessPeriod): Promise<Date> {
  const row = await db.one<{ start: Date }>(`select ${BUSINESS_PERIODS[period]} as start`)
  return row!.start
}

/** Hora local (0-23) de una columna timestamptz. */
export const localHourSql = (column: string) => `extract(hour from ${column} at time zone '${BUSINESS_TIME_ZONE}')::int`

/** Fecha de hoy en Bogotá con formato AAAA-MM-DD. */
export function businessDateToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE }).format(new Date())
}
