import type { Anuncio, DetalleFecha } from '~/lib/data'
import { AGENCIA } from '../contenido/agencia'
import { NOMBRE_OFERTA } from '../contenido/ubicaciones'
import { RUTAS_APP } from '../contenido/negocio'
import { principalDe, type EventoActivo } from './agenda'
import { centavosPublicados } from './etapas'
import { fechasEnTexto, formatoCOP, precioVisible } from './formato'

/** Historia lista para pintar (círculo + diapositiva del visor). */
export interface Historia {
  id: string
  titulo: string
  cuerpo: string | null
  imagenUrl: string | null
  /** Semilla del arte generativo cuando no hay imagen. */
  semilla: string
  llamado: { texto: string; url: string } | null
}

function desdeAnuncio(anuncio: Anuncio): Historia {
  return {
    id: anuncio.id,
    titulo: anuncio.titulo,
    cuerpo: anuncio.cuerpo,
    imagenUrl: anuncio.imagenUrl,
    semilla: anuncio.id,
    llamado: anuncio.ctaUrl ? { texto: anuncio.ctaTexto ?? 'Ver más', url: anuncio.ctaUrl } : null,
  }
}

const unirPartes = (partes: (string | null | false)[]) => partes.filter(Boolean).join(' · ') || null

/** Sin anuncios publicados, las historias se arman con los datos reales del evento activo. */
function desdeEventoActivo(activo: EventoActivo, detalle: DetalleFecha | null): Historia[] {
  const principal = principalDe(activo)
  const precio = principal.precioVigente
  const historias: Historia[] = [
    {
      id: `evento-${principal.id}`,
      titulo: activo.titulo,
      cuerpo: unirPartes([fechasEnTexto(activo.fechas.map((evento) => evento.fecha)), principal.descripcion]),
      imagenUrl: principal.imagenUrl,
      semilla: principal.id,
      llamado: { texto: 'Comprar entrada', url: RUTAS_APP.comprar(principal.id) },
    },
  ]
  if (principal.lineup.length > 0) {
    historias.push({
      id: `lineup-${principal.id}`,
      titulo: 'Line-up',
      cuerpo: principal.lineup.join(' · '),
      imagenUrl: null,
      semilla: `lineup-${principal.id}`,
      llamado: { texto: 'Ver evento', url: '#cartelera' },
    })
  }
  if (precio) {
    historias.push({
      id: `etapa-${principal.id}`,
      titulo: precio.nombre,
      cuerpo: `Entrada general: ${precioVisible(centavosPublicados(precio))}. Compra temprano, el precio sube por etapas.`,
      imagenUrl: null,
      semilla: `etapa-${principal.id}`,
      llamado: { texto: 'Ver etapas', url: '#etapas' },
    })
  }
  for (const oferta of detalle?.oferta.ubicaciones ?? []) {
    historias.push({
      id: `${oferta.tipo}-${principal.id}`,
      titulo: NOMBRE_OFERTA[oferta.tipo],
      cuerpo: unirPartes([formatoCOP(oferta.precioCentavos), oferta.incluye.join(', ')]),
      imagenUrl: null,
      semilla: `${oferta.tipo}-${principal.id}`,
      llamado: { texto: 'Ver plano', url: '#palcos' },
    })
  }
  return historias
}

const HISTORIA_AGENCIA: Historia = {
  id: 'agencia',
  titulo: 'Clases de DJ',
  cuerpo: AGENCIA.servicios[1].texto,
  imagenUrl: null,
  semilla: 'agencia-skpat',
  llamado: { texto: 'Ver agencia', url: '#agencia' },
}

export function armarHistorias(anuncios: Anuncio[], activo: EventoActivo | null, detalle: DetalleFecha | null): Historia[] {
  if (anuncios.length > 0) return anuncios.map(desdeAnuncio)
  return [...(activo ? desdeEventoActivo(activo, detalle) : []), HISTORIA_AGENCIA]
}
