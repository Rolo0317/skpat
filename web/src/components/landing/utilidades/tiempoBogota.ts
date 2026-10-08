import { NEGOCIO } from '../contenido/negocio'

export const MINUTOS_POR_HORA = 60
export const MINUTOS_POR_DIA = 24 * MINUTOS_POR_HORA
export const MS_POR_MINUTO = 60_000

const DIAS_SEMANA_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Día de la semana (0 = domingo) y minuto del día según el reloj de Bogotá. */
export interface MomentoBogota {
  diaSemana: number
  minutosDelDia: number
}

const formateadorBogota = new Intl.DateTimeFormat('en-US', {
  timeZone: NEGOCIO.zonaHoraria,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function parte(partes: Intl.DateTimeFormatPart[], tipo: Intl.DateTimeFormatPartTypes): string {
  return partes.find((p) => p.type === tipo)?.value ?? ''
}

export function momentoEnBogota(fecha: Date): MomentoBogota {
  const partes = formateadorBogota.formatToParts(fecha)
  const diaSemana = DIAS_SEMANA_EN.indexOf(parte(partes, 'weekday') as (typeof DIAS_SEMANA_EN)[number])
  const minutosDelDia = Number(parte(partes, 'hour')) * MINUTOS_POR_HORA + Number(parte(partes, 'minute'))
  return { diaSemana, minutosDelDia }
}

/** Convierte "HH:MM" en minutos desde la medianoche. */
export function horaAMinutos(hora: string): number {
  const [horas = 0, minutos = 0] = hora.split(':').map(Number)
  return horas * MINUTOS_POR_HORA + minutos
}
