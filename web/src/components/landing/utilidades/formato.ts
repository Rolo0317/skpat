import { NEGOCIO } from '../contenido/negocio'
import { MINUTOS_POR_HORA, momentoEnBogota } from './tiempoBogota'

export const CENTAVOS_POR_PESO = 100
const LOCALE = 'es-CO'

const formateadorCOP = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/** Los precios viajan en centavos COP desde la API. */
export function formatoCOP(centavos: number): string {
  return formateadorCOP.format(centavos / CENTAVOS_POR_PESO)
}

function formateadorFecha(opciones: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: NEGOCIO.zonaHoraria, ...opciones })
}

const diaCorto = formateadorFecha({ weekday: 'short' })
const diaLargo = formateadorFecha({ weekday: 'long' })
const numeroDia = formateadorFecha({ day: 'numeric' })
const mesCorto = formateadorFecha({ month: 'short' })
const fechaCompleta = formateadorFecha({ weekday: 'long', day: 'numeric', month: 'long' })

const sinPunto = (texto: string) => texto.replace('.', '')

export interface FechaEvento {
  dia: string
  diaLargo: string
  numero: string
  mes: string
  hora: string
  completa: string
}

export function partesDeFecha(fecha: Date): FechaEvento {
  return {
    dia: sinPunto(diaCorto.format(fecha)),
    diaLargo: diaLargo.format(fecha),
    numero: numeroDia.format(fecha),
    mes: sinPunto(mesCorto.format(fecha)),
    hora: relojDoceHoras(momentoEnBogota(fecha).minutosDelDia),
    completa: fechaCompleta.format(fecha),
  }
}

const HORAS_RELOJ = 12
const DIGITOS_MINUTO = 2

/** 1305 → "9:45 PM": reloj de 12 horas a partir de minutos desde la medianoche. */
export function relojDoceHoras(minutosDelDia: number): string {
  const horas24 = Math.floor(minutosDelDia / MINUTOS_POR_HORA) % (2 * HORAS_RELOJ)
  const minutos = String(minutosDelDia % MINUTOS_POR_HORA).padStart(DIGITOS_MINUTO, '0')
  const sufijo = horas24 < HORAS_RELOJ ? 'AM' : 'PM'
  const horas12 = horas24 % HORAS_RELOJ || HORAS_RELOJ
  return `${horas12}:${minutos} ${sufijo}`
}
