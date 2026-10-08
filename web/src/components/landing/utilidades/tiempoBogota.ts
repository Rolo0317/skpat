import { NEGOCIO } from '../contenido/negocio'

export const MINUTOS_POR_HORA = 60
export const MS_POR_MINUTO = 60_000

const formateadorBogota = new Intl.DateTimeFormat('en-US', {
  timeZone: NEGOCIO.zonaHoraria,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function parte(partes: Intl.DateTimeFormatPart[], tipo: Intl.DateTimeFormatPartTypes): string {
  return partes.find((p) => p.type === tipo)?.value ?? ''
}

/** Minuto del día (0–1439) según el reloj de Bogotá. */
export function minutosDelDiaEnBogota(fecha: Date): number {
  const partes = formateadorBogota.formatToParts(fecha)
  return Number(parte(partes, 'hour')) * MINUTOS_POR_HORA + Number(parte(partes, 'minute'))
}
