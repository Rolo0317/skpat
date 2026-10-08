import { NEGOCIO } from '../contenido/negocio'
import { MINUTOS_POR_HORA, minutosDelDiaEnBogota } from './tiempoBogota'

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
const mesLargo = formateadorFecha({ month: 'long' })
const fechaCompleta = formateadorFecha({ weekday: 'long', day: 'numeric', month: 'long' })

const sinPunto = (texto: string) => texto.replace('.', '')

export interface FechaEvento {
  dia: string
  diaLargo: string
  numero: string
  mes: string
  mesLargo: string
  hora: string
  completa: string
}

export function partesDeFecha(fecha: Date): FechaEvento {
  return {
    dia: sinPunto(diaCorto.format(fecha)),
    diaLargo: diaLargo.format(fecha),
    numero: numeroDia.format(fecha),
    mes: sinPunto(mesCorto.format(fecha)),
    mesLargo: mesLargo.format(fecha),
    hora: relojDoceHoras(minutosDelDiaEnBogota(fecha)),
    completa: fechaCompleta.format(fecha),
  }
}

/** "sáb 10 oct": rótulo corto para botones por fecha. */
export function fechaCorta(fecha: Date): string {
  const { dia, numero, mes } = partesDeFecha(fecha)
  return `${dia} ${numero} ${mes}`
}

const conjuncion = new Intl.ListFormat(LOCALE, { style: 'long', type: 'conjunction' })

/** [sáb 10, dom 11 de octubre] → "sábado 10 y domingo 11 de octubre" (o con el mes en cada fecha si cambia). */
export function fechasEnTexto(fechas: readonly Date[]): string {
  const partes = fechas.map(partesDeFecha)
  const mismoMes = partes.every((parte) => parte.mesLargo === partes[0]?.mesLargo)
  if (!mismoMes) return conjuncion.format(partes.map((parte) => `${parte.diaLargo} ${parte.numero} de ${parte.mesLargo}`))
  const dias = conjuncion.format(partes.map((parte) => `${parte.diaLargo} ${parte.numero}`))
  return partes[0] ? `${dias} de ${partes[0].mesLargo}` : ''
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

const TEXTO_POR_CONFIRMAR = 'Por confirmar'

/** Precio publicado o "Por confirmar" cuando aún no se define (null). */
export function precioVisible(centavos: number | null): string {
  return centavos === null ? TEXTO_POR_CONFIRMAR : formatoCOP(centavos)
}
