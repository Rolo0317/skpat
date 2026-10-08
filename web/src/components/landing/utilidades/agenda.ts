import type { EventoPublico } from '~/lib/data'
import { MS_POR_MINUTO, MINUTOS_POR_HORA } from './tiempoBogota'

/** Igual que la validez del QR (contrato, regla 3): sin ends_at, el evento dura 12 h desde que empieza. */
const HORAS_POR_DEFECTO_DEL_EVENTO = 12
const DURACION_POR_DEFECTO_MS = HORAS_POR_DEFECTO_DEL_EVENTO * MINUTOS_POR_HORA * MS_POR_MINUTO
export const MAX_EVENTOS_EN_CARTELERA = 6

export function finDelEvento(evento: EventoPublico): Date {
  return evento.terminaEn ?? new Date(evento.fecha.getTime() + DURACION_POR_DEFECTO_MS)
}

function sigueVigente(evento: EventoPublico, ahora: Date): boolean {
  return finDelEvento(evento).getTime() > ahora.getTime()
}

export function eventosVigentes(eventos: EventoPublico[], ahora: Date): EventoPublico[] {
  return eventos
    .filter((evento) => sigueVigente(evento, ahora))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
}

export function estaSucediendo(evento: EventoPublico, ahora: Date): boolean {
  return evento.fecha.getTime() <= ahora.getTime() && sigueVigente(evento, ahora)
}

/**
 * Un evento activo puede tener varias fechas (p. ej. un maratón sábado y domingo): en la base son eventos
 * con el mismo título y en la web se muestran como uno solo, con un botón por fecha.
 */
export interface EventoActivo {
  clave: string
  titulo: string
  /** Fechas vigentes ordenadas; la primera es la principal (flyer, descripción, etapas). */
  fechas: [EventoPublico, ...EventoPublico[]]
}

export const principalDe = (activo: EventoActivo): EventoPublico => activo.fechas[0]

const claveDeTitulo = (titulo: string) => titulo.trim().toLocaleLowerCase('es-CO')

function agruparPorTitulo(eventos: EventoPublico[]): EventoActivo[] {
  const grupos = new Map<string, EventoActivo>()
  for (const evento of eventos) {
    const clave = claveDeTitulo(evento.titulo)
    const grupo = grupos.get(clave)
    if (grupo) grupo.fechas.push(evento)
    else grupos.set(clave, { clave, titulo: evento.titulo, fechas: [evento] })
  }
  return [...grupos.values()]
}

export interface Cartelera {
  /** Evento activo actual: el que protagoniza portada, etapas, palcos y asistente. */
  destacado: EventoActivo | null
  otros: EventoActivo[]
}

/** Solo eventos activos y vigentes, agrupados por título y en orden de su primera fecha. */
export function armarCartelera(eventos: EventoPublico[], ahora: Date): Cartelera {
  const [destacado = null, ...otros] = agruparPorTitulo(eventosVigentes(eventos, ahora))
  return { destacado, otros: otros.slice(0, MAX_EVENTOS_EN_CARTELERA - 1) }
}
