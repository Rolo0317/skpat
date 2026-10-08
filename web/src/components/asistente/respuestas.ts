import type { AjustesLugar, DetalleFecha } from '~/lib/data'
import { AGENCIA } from '~/components/landing/contenido/agencia'
import { NEGOCIO } from '~/components/landing/contenido/negocio'
import { NOMBRE_OFERTA } from '~/components/landing/contenido/ubicaciones'
import { principalDe, type EventoActivo } from '~/components/landing/utilidades/agenda'
import { contactosWhatsapp, textoDireccion, type ContactoWhatsapp } from '~/components/landing/utilidades/contacto'
import { armarEtapas } from '~/components/landing/utilidades/etapas'
import { fechasEnTexto, formatoCOP, precioVisible } from '~/components/landing/utilidades/formato'

/**
 * Asistente de evento SIN IA: respuestas rápidas armadas en el servidor con los datos reales de la API.
 * El navegador solo las muestra y arma el enlace de WhatsApp con el gestor elegido.
 */
export type IdTema = 'evento' | 'precios' | 'palcos' | 'listas' | 'ubicacion' | 'agencia' | 'gestor'

export interface TemaAsistente {
  id: IdTema
  pregunta: string
  respuesta: string
  enlace: { texto: string; url: string } | null
  mensajeWhatsapp: string
}

export interface DatosAsistente {
  temas: TemaAsistente[]
  gestores: ContactoWhatsapp[]
}

interface Contexto {
  activo: EventoActivo | null
  detalle: DetalleFecha | null
  ajustes: AjustesLugar
  ahora: Date
}

const SALUDO = 'Hola Skpat VIP, vengo de la web.'
const SIN_EVENTO = 'Aún no hay un evento activo publicado. Escríbele a un gestor y te cuenta la próxima fecha.'

const sobreElEvento = ({ activo }: Contexto) => (activo ? ` de ${activo.titulo}` : '')

function respuestaEvento({ activo }: Contexto): string {
  if (!activo) return SIN_EVENTO
  const principal = principalDe(activo)
  const partes = [
    `${activo.titulo}: ${fechasEnTexto(activo.fechas.map((evento) => evento.fecha))}.`,
    principal.lineup.length > 0 ? `Line-up: ${principal.lineup.join(', ')}.` : null,
    principal.descripcion,
  ]
  return partes.filter(Boolean).join(' ')
}

function respuestaPrecios({ activo, detalle, ahora }: Contexto): string {
  if (!activo || !detalle) return SIN_EVENTO
  const etapas = armarEtapas(detalle.oferta, detalle.evento, ahora)
    .filter((etapa) => etapa.estado !== 'vencida')
    .map((etapa) => `${etapa.nombre}: ${precioVisible(etapa.precioCentavos)}${etapa.estado === 'vigente' ? ' (precio de hoy)' : ''}`)
  return `Entrada general por etapas — ${etapas.join(' · ')}. Compras en la web y cierras el pago por WhatsApp con un gestor.`
}

function respuestaPalcos({ detalle }: Contexto): string {
  const ofertas = detalle?.oferta.ubicaciones ?? []
  if (ofertas.length === 0) return 'Los palcos y mesas se apartan con un gestor por WhatsApp. Pregúntale por precios y disponibilidad.'
  const detalleOfertas = ofertas.map(
    (oferta) => `${NOMBRE_OFERTA[oferta.tipo]} ${formatoCOP(oferta.precioCentavos)}: ${oferta.incluye.join(', ')}.`,
  )
  const disponibles = detalle?.ubicaciones.filter((ubicacion) => ubicacion.estado === 'disponible').length ?? 0
  return `${detalleOfertas.join(' ')} Hoy hay ${disponibles} disponibles en el plano; tocas uno, llenas tus datos y pagas por WhatsApp.`
}

function respuestaUbicacion({ ajustes }: Contexto): string {
  return `${textoDireccion(ajustes)}, ${NEGOCIO.direccion.ciudad}. Abrimos ${NEGOCIO.horario.dias.toLowerCase()}, ${NEGOCIO.horario.texto.toLowerCase()}. Solo mayores de ${NEGOCIO.edadMinima}.`
}

const CONSTRUCTORES: Record<IdTema, (contexto: Contexto) => Omit<TemaAsistente, 'id'>> = {
  evento: (contexto) => ({
    pregunta: 'Evento activo',
    respuesta: respuestaEvento(contexto),
    enlace: contexto.activo ? { texto: 'Ver evento', url: '#cartelera' } : null,
    mensajeWhatsapp: `${SALUDO} Quiero información del evento${sobreElEvento(contexto)}.`,
  }),
  precios: (contexto) => ({
    pregunta: 'Precios y etapas',
    respuesta: respuestaPrecios(contexto),
    enlace: contexto.activo ? { texto: 'Ver etapas', url: '#etapas' } : null,
    mensajeWhatsapp: `${SALUDO} Quiero comprar entrada general${sobreElEvento(contexto)}.`,
  }),
  palcos: (contexto) => ({
    pregunta: 'Palcos y mesas',
    respuesta: respuestaPalcos(contexto),
    enlace: { texto: 'Ver plano', url: '#palcos' },
    mensajeWhatsapp: `${SALUDO} Quiero reservar un palco o una mesa${sobreElEvento(contexto)}.`,
  }),
  listas: (contexto) => ({
    pregunta: 'Listas',
    respuesta: 'La lista es gratis: te inscribes con el enlace que te comparte tu gestor y recibes tu QR al instante. Pídele el enlace a un gestor.',
    enlace: null,
    mensajeWhatsapp: `${SALUDO} Quiero que me anoten en lista${sobreElEvento(contexto)}.`,
  }),
  ubicacion: (contexto) => ({
    pregunta: 'Ubicación y horario',
    respuesta: respuestaUbicacion(contexto),
    enlace: { texto: 'Cómo llegar', url: '#ubicacion' },
    mensajeWhatsapp: `${SALUDO} ¿Me compartes la dirección exacta?`,
  }),
  agencia: () => ({
    pregunta: 'Agencia y cursos de DJ',
    respuesta: `${AGENCIA.intro} Horarios, valores y disponibilidad de DJs te los damos por WhatsApp.`,
    enlace: { texto: 'Ver agencia', url: '#agencia' },
    mensajeWhatsapp: `${SALUDO} Quiero información de la agencia: cursos de DJ o contratar un DJ.`,
  }),
  gestor: (contexto) => ({
    pregunta: 'Hablar con un gestor',
    respuesta: 'Elige con quién quieres hablar y te abrimos WhatsApp con el mensaje listo.',
    enlace: null,
    mensajeWhatsapp: `${SALUDO} Quiero hablar con un gestor${sobreElEvento(contexto)}.`,
  }),
}

export function armarAsistente(contexto: Contexto): DatosAsistente {
  const temas = (Object.keys(CONSTRUCTORES) as IdTema[]).map((id) => ({ id, ...CONSTRUCTORES[id](contexto) }))
  return { temas, gestores: contactosWhatsapp(contexto.ajustes) }
}
