import { getBackend } from '~/lib/backend'

/**
 * Capa de datos de la web pública: lee la API de Fastify en proceso (sin red) y normaliza al vocabulario
 * de la landing. Ante cualquier fallo (endpoint pendiente, base caída, tiempo agotado) devuelve un respaldo
 * para que la página nunca se caiga. Contrato: docs/contrato-operacion-eventos.md.
 */

/** Precio de la entrada general que aplica ahora (etapa vigente o taquilla). */
export interface PrecioVigente {
  nombre: string
  precioCentavos: number
  terminaEn: Date | null
  esTaquilla: boolean
}

/** Evento tal como lo necesita la landing (normalizado desde la API pública /events). */
export interface EventoPublico {
  id: string
  titulo: string
  fecha: Date
  terminaEn: Date | null
  descripcion: string | null
  /** Precio de taquilla (events.price); 0 = por confirmar. */
  precioCentavos: number
  precioVigente: PrecioVigente | null
  imagenUrl: string | null
  cuposDisponibles: number
  esVip: boolean
  lineup: string[]
  genero: string | null
}

/** Producto de la carta (API pública /menu). */
export interface ItemCarta {
  id: string
  nombre: string
  descripcion: string | null
  categoria: string
  precioCentavos: number
}

/** Gestor que vende y atiende por WhatsApp. */
export interface Gestor {
  id: string
  nombre: string
  whatsapp: string
}

/** Datos del lugar editables por el admin (GET /settings). */
export interface AjustesLugar {
  direccion: string | null
  referencia: string | null
  mapaUrl: string | null
  gestores: Gestor[]
}

export interface Etapa {
  id: string
  nombre: string
  precioCentavos: number
  terminaEn: Date | null
  orden: number
}

export type TipoUbicacion = 'palco' | 'mesa'
export type EstadoUbicacion = 'disponible' | 'reservado' | 'vendido'

export interface OfertaUbicacion {
  tipo: TipoUbicacion
  precioCentavos: number
  incluye: string[]
}

/** GET /events/:id/oferta */
export interface OfertaEvento {
  etapas: Etapa[]
  precioVigente: PrecioVigente | null
  ubicaciones: OfertaUbicacion[]
}

/** Palco o mesa del plano, con su posición en % y su estado para una fecha. */
export interface Ubicacion {
  id: string
  tipo: TipoUbicacion
  numero: number
  capacidad: number
  x: number
  y: number
  estado: EstadoUbicacion
}

export interface Anuncio {
  id: string
  titulo: string
  cuerpo: string | null
  imagenUrl: string | null
  ctaTexto: string | null
  ctaUrl: string | null
}

export interface FotoGaleria {
  id: string
  url: string
  leyenda: string | null
  eventoTitulo: string | null
}

/** GET /lists/:slug */
export interface ListaPublica {
  nombre: string
  evento: { id: string; titulo: string; fecha: Date }
  cupo: number | null
  inscritos: number
  cierraEn: Date | null
  abierta: boolean
  gestor: Gestor | null
}

/** Todo lo que la landing necesita de una fecha concreta del evento activo. */
export interface DetalleFecha {
  evento: EventoPublico
  oferta: OfertaEvento
  ubicaciones: Ubicacion[]
}

export interface DatosLanding {
  eventos: EventoPublico[]
  carta: ItemCarta[]
  ajustes: AjustesLugar
  anuncios: Anuncio[]
  galeria: FotoGaleria[]
}

type Registro = Record<string, unknown>

const ESTADO_OK = 200
const TIEMPO_MAXIMO_MS = 4000

export const AJUSTES_VACIOS: AjustesLugar = { direccion: null, referencia: null, mapaUrl: null, gestores: [] }
const OFERTA_VACIA: OfertaEvento = { etapas: [], precioVigente: null, ubicaciones: [] }

const esRegistro = (valor: unknown): valor is Registro => typeof valor === 'object' && valor !== null && !Array.isArray(valor)
const texto = (valor: unknown): string | null => (typeof valor === 'string' && valor.trim() ? valor : null)
const numero = (valor: unknown): number => (Number.isFinite(Number(valor)) ? Number(valor) : 0)
const numeroOpcional = (valor: unknown): number | null => (valor === null || valor === undefined ? null : numero(valor))
const listaDeTextos = (valor: unknown): string[] =>
  Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : []

function fechaOpcional(valor: unknown): Date | null {
  if (valor === null || valor === undefined || valor === '') return null
  const fecha = new Date(String(valor))
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

/** Como en el flyer: primero palcos, luego mesas. */
const ORDEN_TIPO: Record<TipoUbicacion, number> = { palco: 0, mesa: 1 }
const esTipoUbicacion = (valor: unknown): valor is TipoUbicacion => valor === 'palco' || valor === 'mesa'
const ESTADOS_UBICACION: readonly EstadoUbicacion[] = ['disponible', 'reservado', 'vendido']
const esEstadoUbicacion = (valor: unknown): valor is EstadoUbicacion => ESTADOS_UBICACION.includes(valor as EstadoUbicacion)

/* ---------- Normalizadores (API → landing) ---------- */

function normalizarPrecioVigente(valor: unknown): PrecioVigente | null {
  if (!esRegistro(valor)) return null
  return {
    nombre: texto(valor.nombre) ?? 'Entrada',
    precioCentavos: numero(valor.price_cents),
    terminaEn: fechaOpcional(valor.ends_at),
    esTaquilla: Boolean(valor.es_taquilla),
  }
}

function normalizarEvento(fila: Registro): EventoPublico | null {
  const id = texto(fila.id)
  const titulo = texto(fila.title)
  const fecha = fechaOpcional(fila.date)
  if (!id || !titulo || !fecha) return null
  return {
    id,
    titulo,
    fecha,
    terminaEn: fechaOpcional(fila.ends_at),
    descripcion: texto(fila.description),
    precioCentavos: numero(fila.price),
    precioVigente: normalizarPrecioVigente(fila.precio_vigente),
    imagenUrl: texto(fila.image_url),
    cuposDisponibles: numero(fila.available_spots),
    esVip: Boolean(fila.is_vip),
    lineup: listaDeTextos(fila.lineup),
    genero: texto(fila.genre),
  }
}

function normalizarItemCarta(fila: Registro): ItemCarta | null {
  const id = texto(fila.id)
  const nombre = texto(fila.name)
  if (!id || !nombre) return null
  return {
    id,
    nombre,
    descripcion: texto(fila.description),
    categoria: texto(fila.category) ?? 'general',
    precioCentavos: numero(fila.price_cents),
  }
}

function normalizarGestor(fila: unknown): Gestor | null {
  if (!esRegistro(fila)) return null
  const id = texto(fila.id)
  const nombre = texto(fila.nombre)
  const whatsapp = texto(fila.whatsapp)
  return id && nombre && whatsapp ? { id, nombre, whatsapp } : null
}

const soloValidos = <T>(items: (T | null)[]): T[] => items.filter((item): item is T => item !== null)

function normalizarAjustes(cuerpo: unknown): AjustesLugar | null {
  if (!esRegistro(cuerpo)) return null
  return {
    direccion: texto(cuerpo.direccion),
    referencia: texto(cuerpo.referencia),
    mapaUrl: texto(cuerpo.mapa_url),
    gestores: Array.isArray(cuerpo.gestores) ? soloValidos(cuerpo.gestores.map(normalizarGestor)) : [],
  }
}

function normalizarEtapa(fila: unknown): Etapa | null {
  if (!esRegistro(fila)) return null
  const id = texto(fila.id)
  const nombre = texto(fila.nombre)
  if (!id || !nombre) return null
  return {
    id,
    nombre,
    precioCentavos: numero(fila.price_cents),
    terminaEn: fechaOpcional(fila.ends_at),
    orden: numero(fila.sort_order),
  }
}

function normalizarOfertaUbicacion(fila: unknown): OfertaUbicacion | null {
  if (!esRegistro(fila) || !esTipoUbicacion(fila.tipo)) return null
  return { tipo: fila.tipo, precioCentavos: numero(fila.price_cents), incluye: listaDeTextos(fila.incluye) }
}

function normalizarOferta(cuerpo: unknown): OfertaEvento | null {
  if (!esRegistro(cuerpo)) return null
  const etapas = Array.isArray(cuerpo.etapas) ? soloValidos(cuerpo.etapas.map(normalizarEtapa)) : []
  const ubicaciones = Array.isArray(cuerpo.ubicaciones) ? soloValidos(cuerpo.ubicaciones.map(normalizarOfertaUbicacion)) : []
  return {
    etapas: etapas.sort((a, b) => a.orden - b.orden),
    precioVigente: normalizarPrecioVigente(cuerpo.precio_vigente),
    ubicaciones: ubicaciones.sort((a, b) => ORDEN_TIPO[a.tipo] - ORDEN_TIPO[b.tipo]),
  }
}

function normalizarUbicacion(fila: Registro): Ubicacion | null {
  const id = texto(fila.id)
  if (!id || !esTipoUbicacion(fila.tipo)) return null
  return {
    id,
    tipo: fila.tipo,
    numero: numero(fila.numero),
    capacidad: numero(fila.capacidad),
    x: numero(fila.posicion_x),
    y: numero(fila.posicion_y),
    estado: esEstadoUbicacion(fila.estado) ? fila.estado : 'vendido',
  }
}

function normalizarAnuncio(fila: Registro): Anuncio | null {
  const id = texto(fila.id)
  const titulo = texto(fila.titulo)
  if (!id || !titulo) return null
  return {
    id,
    titulo,
    cuerpo: texto(fila.cuerpo),
    imagenUrl: texto(fila.image_url),
    ctaTexto: texto(fila.cta_label),
    ctaUrl: texto(fila.cta_url),
  }
}

function normalizarFoto(fila: Registro): FotoGaleria | null {
  const id = texto(fila.id)
  const url = texto(fila.url)
  if (!id || !url) return null
  return { id, url, leyenda: texto(fila.caption), eventoTitulo: texto(fila.event_title) }
}

function normalizarListaPublica(cuerpo: unknown): ListaPublica | null {
  if (!esRegistro(cuerpo) || !esRegistro(cuerpo.evento)) return null
  const nombre = texto(cuerpo.nombre)
  const eventoId = texto(cuerpo.evento.id)
  const eventoTitulo = texto(cuerpo.evento.title)
  const eventoFecha = fechaOpcional(cuerpo.evento.date)
  if (!nombre || !eventoId || !eventoTitulo || !eventoFecha) return null
  return {
    nombre,
    evento: { id: eventoId, titulo: eventoTitulo, fecha: eventoFecha },
    cupo: numeroOpcional(cuerpo.cupo),
    inscritos: numero(cuerpo.inscritos),
    cierraEn: fechaOpcional(cuerpo.cierra_at),
    abierta: Boolean(cuerpo.abierta),
    gestor: normalizarGestor(cuerpo.gestor),
  }
}

/** Convierte un normalizador de filas en uno de colecciones (descarta filas inválidas). */
const coleccion =
  <T>(normalizarFila: (fila: Registro) => T | null) =>
  (cuerpo: unknown): T[] | null =>
    Array.isArray(cuerpo) ? soloValidos(cuerpo.filter(esRegistro).map(normalizarFila)) : null

/* ---------- Lectura tolerante a fallos ---------- */

function conTiempoMaximo<T>(promesa: Promise<T>): Promise<T> {
  const limite = new Promise<never>((_, rechazar) =>
    setTimeout(() => rechazar(new Error('Tiempo de espera agotado')), TIEMPO_MAXIMO_MS),
  )
  return Promise.race([promesa, limite])
}

async function leerJsonPublico(url: string): Promise<unknown> {
  const app = await getBackend()
  const respuesta = await app.inject({ method: 'GET', url })
  if (respuesta.statusCode !== ESTADO_OK) throw new Error(`${url} respondió ${respuesta.statusCode}`)
  return respuesta.json()
}

/** Lee y normaliza un recurso público; ante cualquier fallo devuelve el respaldo. */
async function obtener<T>(url: string, normalizar: (cuerpo: unknown) => T | null, respaldo: T): Promise<T> {
  try {
    return normalizar(await conTiempoMaximo(leerJsonPublico(url))) ?? respaldo
  } catch (error) {
    console.warn(`[web] No se pudo leer ${url}:`, error instanceof Error ? error.message : error)
    return respaldo
  }
}

const rutaDeEvento = (eventoId: string, recurso: string) => `/events/${encodeURIComponent(eventoId)}/${recurso}`

export const obtenerEventos = () => obtener('/events', coleccion(normalizarEvento), [])
export const obtenerCarta = () => obtener('/menu', coleccion(normalizarItemCarta), [])
export const obtenerAjustes = () => obtener('/settings', normalizarAjustes, AJUSTES_VACIOS)
export const obtenerAnuncios = () => obtener('/announcements', coleccion(normalizarAnuncio), [])
export const obtenerGaleria = () => obtener('/gallery', coleccion(normalizarFoto), [])
export const obtenerOferta = (eventoId: string) => obtener(rutaDeEvento(eventoId, 'oferta'), normalizarOferta, OFERTA_VACIA)
export const obtenerUbicaciones = (eventoId: string) =>
  obtener(rutaDeEvento(eventoId, 'ubicaciones'), coleccion(normalizarUbicacion), [])
export const obtenerListaPublica = (slug: string) =>
  obtener<ListaPublica | null>(`/lists/${encodeURIComponent(slug)}`, normalizarListaPublica, null)

/** Oferta (etapas, palcos, mesas) y estado del plano de cada fecha del evento activo. */
export function obtenerDetallesDeFechas(fechas: EventoPublico[]): Promise<DetalleFecha[]> {
  return Promise.all(
    fechas.map(async (evento) => {
      const [oferta, ubicaciones] = await Promise.all([obtenerOferta(evento.id), obtenerUbicaciones(evento.id)])
      return { evento, oferta, ubicaciones }
    }),
  )
}

export async function obtenerDatosLanding(): Promise<DatosLanding> {
  const [eventos, carta, ajustes, anuncios, galeria] = await Promise.all([
    obtenerEventos(),
    obtenerCarta(),
    obtenerAjustes(),
    obtenerAnuncios(),
    obtenerGaleria(),
  ])
  return { eventos, carta, ajustes, anuncios, galeria }
}
