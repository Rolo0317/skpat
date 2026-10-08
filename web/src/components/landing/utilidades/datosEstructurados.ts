import type { EventoPublico } from '~/lib/data'
import { NEGOCIO, RUTAS_APP } from '../contenido/negocio'
import { finDelEvento } from './agenda'
import { CENTAVOS_POR_PESO } from './formato'

const DIAS_ABIERTOS_SCHEMA = ['https://schema.org/Friday', 'https://schema.org/Saturday']

function direccionPostal() {
  return {
    '@type': 'PostalAddress',
    streetAddress: NEGOCIO.direccion.calle,
    addressLocality: NEGOCIO.direccion.ciudad,
    addressRegion: NEGOCIO.direccion.region,
    addressCountry: NEGOCIO.direccion.pais,
  }
}

function discoteca(origen: string) {
  return {
    '@type': 'NightClub',
    '@id': `${origen}/#discoteca`,
    name: NEGOCIO.nombre,
    description: NEGOCIO.eslogan,
    url: origen,
    image: `${origen}/og.png`,
    address: direccionPostal(),
    sameAs: [NEGOCIO.instagram.url],
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DIAS_ABIERTOS_SCHEMA,
      opens: NEGOCIO.horario.apertura,
      closes: NEGOCIO.horario.cierre,
    },
  }
}

function eventoSchema(evento: EventoPublico, origen: string) {
  return {
    '@type': 'Event',
    name: evento.titulo,
    description: evento.descripcion ?? NEGOCIO.eslogan,
    startDate: evento.fecha.toISOString(),
    endDate: finDelEvento(evento).toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@id': `${origen}/#discoteca` },
    ...(evento.imagenUrl ? { image: new URL(evento.imagenUrl, origen).href } : {}),
    ...(evento.lineup.length ? { performer: evento.lineup.map((name) => ({ '@type': 'PerformingGroup', name })) } : {}),
    offers: {
      '@type': 'Offer',
      url: `${origen}${RUTAS_APP.comprar(evento.id)}`,
      price: evento.precioCentavos / CENTAVOS_POR_PESO,
      priceCurrency: 'COP',
      availability: evento.cuposDisponibles > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    },
  }
}

/** JSON-LD listo para incrustar; escapa "<" para que ningún texto pueda cerrar el <script>. */
export function datosEstructurados(eventos: EventoPublico[], origen: string): string {
  const grafo = {
    '@context': 'https://schema.org',
    '@graph': [discoteca(origen), ...eventos.map((evento) => eventoSchema(evento, origen))],
  }
  return JSON.stringify(grafo).replace(/</g, '\\u003c')
}
