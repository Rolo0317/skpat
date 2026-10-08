import { getBackend } from '~/lib/backend'

/** Evento tal como lo necesita la landing (normalizado desde la API pública /events). */
export interface EventoPublico {
  id: string
  titulo: string
  fecha: Date
  descripcion: string | null
  precioCentavos: number
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

export interface DatosLanding {
  eventos: EventoPublico[]
  carta: ItemCarta[]
}

type Registro = Record<string, unknown>

const ESTADO_OK = 200
const TIEMPO_MAXIMO_MS = 4000

const texto = (valor: unknown): string | null => (typeof valor === 'string' && valor.trim() ? valor : null)
const numero = (valor: unknown): number => (Number.isFinite(Number(valor)) ? Number(valor) : 0)
const listaDeTextos = (valor: unknown): string[] =>
  Array.isArray(valor) ? valor.filter((item): item is string => typeof item === 'string') : []

function normalizarEvento(fila: Registro): EventoPublico | null {
  const id = texto(fila.id)
  const titulo = texto(fila.title)
  const fecha = new Date(String(fila.date))
  if (!id || !titulo || Number.isNaN(fecha.getTime())) return null
  return {
    id,
    titulo,
    fecha,
    descripcion: texto(fila.description),
    precioCentavos: numero(fila.price),
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

function conTiempoMaximo<T>(promesa: Promise<T>): Promise<T> {
  const limite = new Promise<never>((_, rechazar) =>
    setTimeout(() => rechazar(new Error('Tiempo de espera agotado')), TIEMPO_MAXIMO_MS),
  )
  return Promise.race([promesa, limite])
}

async function leerListaPublica(url: string): Promise<Registro[]> {
  const app = await getBackend()
  const respuesta = await app.inject({ method: 'GET', url })
  if (respuesta.statusCode !== ESTADO_OK) throw new Error(`${url} respondió ${respuesta.statusCode}`)
  const cuerpo: unknown = respuesta.json()
  return Array.isArray(cuerpo) ? cuerpo : []
}

/** Lee y normaliza una lista; ante cualquier fallo devuelve [] para que la landing nunca se caiga. */
async function obtenerLista<T>(url: string, normalizar: (fila: Registro) => T | null): Promise<T[]> {
  try {
    const filas = await conTiempoMaximo(leerListaPublica(url))
    return filas.map(normalizar).filter((item): item is T => item !== null)
  } catch (error) {
    console.warn(`[landing] No se pudo leer ${url}:`, error instanceof Error ? error.message : error)
    return []
  }
}

export function obtenerEventos(): Promise<EventoPublico[]> {
  return obtenerLista('/events', normalizarEvento)
}

export function obtenerCarta(): Promise<ItemCarta[]> {
  return obtenerLista('/menu', normalizarItemCarta)
}

export async function obtenerDatosLanding(): Promise<DatosLanding> {
  const [eventos, carta] = await Promise.all([obtenerEventos(), obtenerCarta()])
  return { eventos, carta }
}
