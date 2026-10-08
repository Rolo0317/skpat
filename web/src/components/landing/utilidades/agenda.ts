import type { EventoPublico } from '~/lib/data'
import { DURACION_NOCHE_MIN } from '../contenido/tarifas'
import { MINUTOS_POR_DIA, MS_POR_MINUTO } from './tiempoBogota'

const DIAS_DE_UNA_SEMANA = 7
const MS_POR_DIA = MINUTOS_POR_DIA * MS_POR_MINUTO
const DURACION_EVENTO_MS = DURACION_NOCHE_MIN * MS_POR_MINUTO
export const MAX_EVENTOS_EN_CARTELERA = 6

/** Un evento dura lo que dura la noche en que empezó. */
export function finDelEvento(evento: EventoPublico): Date {
  return new Date(evento.fecha.getTime() + DURACION_EVENTO_MS)
}

function sigueVigente(evento: EventoPublico, ahora: Date): boolean {
  return finDelEvento(evento).getTime() > ahora.getTime()
}

export function eventosVigentes(eventos: EventoPublico[], ahora: Date): EventoPublico[] {
  return eventos
    .filter((evento) => sigueVigente(evento, ahora))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
}

export function esEstaSemana(evento: EventoPublico, ahora: Date): boolean {
  return evento.fecha.getTime() - ahora.getTime() < DIAS_DE_UNA_SEMANA * MS_POR_DIA
}

export function estaSucediendo(evento: EventoPublico, ahora: Date): boolean {
  return evento.fecha.getTime() <= ahora.getTime() && sigueVigente(evento, ahora)
}

export interface Cartelera {
  proximo: EventoPublico | null
  eventos: EventoPublico[]
  titulo: string
}

export function armarCartelera(eventos: EventoPublico[], ahora: Date): Cartelera {
  const vigentes = eventosVigentes(eventos, ahora)
  const hayEstaSemana = vigentes.some((evento) => esEstaSemana(evento, ahora))
  return {
    proximo: vigentes[0] ?? null,
    eventos: vigentes.slice(0, MAX_EVENTOS_EN_CARTELERA),
    titulo: hayEstaSemana ? 'Esta semana' : 'Próximas fechas',
  }
}
