import type { AjustesLugar, EventoPublico } from '~/lib/data'
import { NEGOCIO, REDES, RUTAS_APP } from '../contenido/negocio'
import { finDelEvento } from './agenda'
import { contactosWhatsapp } from './contacto'
import { CENTAVOS_POR_PESO } from './formato'
import { jsonSeguro } from './jsonSeguro'

/** Sin hora de cierre: schema.org representa "abierto todo el día" con 00:00–23:59. */
const ABRE_TODO_EL_DIA = { opens: '00:00', closes: '23:59' } as const

function direccionPostal(ajustes: AjustesLugar) {
  return {
    '@type': 'PostalAddress',
    ...(ajustes.direccion ? { streetAddress: ajustes.direccion } : {}),
    addressLocality: NEGOCIO.direccion.ciudad,
    addressRegion: NEGOCIO.direccion.region,
    addressCountry: NEGOCIO.direccion.pais,
  }
}

function discoteca(origen: string, ajustes: AjustesLugar) {
  const [contacto] = contactosWhatsapp(ajustes)
  return {
    '@type': 'NightClub',
    '@id': `${origen}/#discoteca`,
    name: NEGOCIO.nombre,
    description: `${NEGOCIO.eslogan}. ${NEGOCIO.horario.dias}, ${NEGOCIO.horario.texto.toLowerCase()}. Agencia de DJs y academia.`,
    url: origen,
    image: `${origen}/marca/og-skpat.jpg`,
    logo: `${origen}/marca/icon-skpat-512.png`,
    ...(contacto ? { telephone: contacto.whatsapp } : {}),
    address: direccionPostal(ajustes),
    sameAs: REDES.filter(({ id }) => id !== 'whatsapp').map(({ url }) => url),
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: NEGOCIO.horario.diasSchema.map((dia) => `https://schema.org/${dia}`),
      ...ABRE_TODO_EL_DIA,
    },
  }
}

function eventoSchema(evento: EventoPublico, origen: string) {
  const precio = evento.precioVigente?.precioCentavos ?? evento.precioCentavos
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
      price: precio / CENTAVOS_POR_PESO,
      priceCurrency: 'COP',
      availability: evento.cuposDisponibles > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    },
  }
}

/** JSON-LD listo para incrustar en la cabecera. */
export function datosEstructurados(eventos: EventoPublico[], ajustes: AjustesLugar, origen: string): string {
  const grafo = {
    '@context': 'https://schema.org',
    '@graph': [discoteca(origen, ajustes), ...eventos.map((evento) => eventoSchema(evento, origen))],
  }
  return jsonSeguro(grafo)
}
