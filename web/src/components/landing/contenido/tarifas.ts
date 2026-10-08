import { NEGOCIO } from './negocio'
import { MINUTOS_POR_DIA, horaAMinutos, momentoEnBogota } from '../utilidades/tiempoBogota'
import { relojDoceHoras } from '../utilidades/formato'

export type IdTarifa = 'madrugador' | 'regular' | 'noche-alta'

export interface Tarifa {
  id: IdTarifa
  nombre: string
  rango: string
  desde: string
  precioCentavos: number
}

/** Cover por hora de llegada. "desde" marca el inicio de cada franja; la última llega hasta el cierre. */
export const TARIFAS: readonly Tarifa[] = [
  { id: 'madrugador', nombre: 'Madrugador', rango: 'Antes de 10 PM', desde: NEGOCIO.horario.apertura, precioCentavos: 20_000_00 },
  { id: 'regular', nombre: 'Regular', rango: '10 – 11:30 PM', desde: '22:00', precioCentavos: 30_000_00 },
  { id: 'noche-alta', nombre: 'Noche alta', rango: 'Después de 11:30 PM', desde: '23:30', precioCentavos: 40_000_00 },
]

const VIERNES = 5
const SABADO = 6
const NOCHES_ABIERTAS: readonly number[] = [VIERNES, SABADO]
const DIAS_EN_SEMANA = 7

const MINUTO_APERTURA = horaAMinutos(NEGOCIO.horario.apertura)
export const DURACION_NOCHE_MIN = (horaAMinutos(NEGOCIO.horario.cierre) - MINUTO_APERTURA + MINUTOS_POR_DIA) % MINUTOS_POR_DIA

/** Minutos transcurridos desde la apertura (el reloj de la noche cruza la medianoche). */
export function minutosDesdeApertura(minutosDelDia: number): number {
  return (minutosDelDia - MINUTO_APERTURA + MINUTOS_POR_DIA) % MINUTOS_POR_DIA
}

export function inicioDeTarifaMin(tarifa: Tarifa): number {
  return minutosDesdeApertura(horaAMinutos(tarifa.desde))
}

export function finDeTarifaMin(indice: number): number {
  const siguiente = TARIFAS[indice + 1]
  return siguiente ? inicioDeTarifaMin(siguiente) : DURACION_NOCHE_MIN
}

export function tarifaEnMinuto(minutoDeNoche: number): Tarifa {
  return [...TARIFAS].reverse().find((tarifa) => minutoDeNoche >= inicioDeTarifaMin(tarifa)) ?? TARIFAS[0]!
}

export type EstadoNoche =
  | { tipo: 'abierto'; tarifa: Tarifa; minutoDeNoche: number }
  | { tipo: 'abre-hoy'; tarifa: Tarifa }
  | { tipo: 'cerrado'; tarifa: Tarifa }

/** La noche pertenece al día en que abrió: el sábado a las 2 AM sigue siendo la noche del viernes. */
function diaDeLaNoche(diaSemana: number, minutosDelDia: number): number {
  const pasoLaMedianoche = minutosDelDia < MINUTO_APERTURA
  return pasoLaMedianoche ? (diaSemana - 1 + DIAS_EN_SEMANA) % DIAS_EN_SEMANA : diaSemana
}

export function estadoDeLaNoche(ahora: Date): EstadoNoche {
  const { diaSemana, minutosDelDia } = momentoEnBogota(ahora)
  const minutoDeNoche = minutosDesdeApertura(minutosDelDia)
  const nocheAbierta = NOCHES_ABIERTAS.includes(diaDeLaNoche(diaSemana, minutosDelDia))
  const primeraTarifa = TARIFAS[0]!

  if (nocheAbierta && minutoDeNoche < DURACION_NOCHE_MIN) {
    return { tipo: 'abierto', tarifa: tarifaEnMinuto(minutoDeNoche), minutoDeNoche }
  }
  const abreMasTarde = NOCHES_ABIERTAS.includes(diaSemana) && minutosDelDia < MINUTO_APERTURA
  return { tipo: abreMasTarde ? 'abre-hoy' : 'cerrado', tarifa: primeraTarifa }
}

/** Hora de reloj que corresponde a un minuto de la noche (0 = apertura). */
export function horaDeLaNoche(minutoDeNoche: number): string {
  return relojDoceHoras((MINUTO_APERTURA + minutoDeNoche) % MINUTOS_POR_DIA)
}
