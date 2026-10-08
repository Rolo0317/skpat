/** Utilidades de navegador compartidas por los formularios de reserva (palcos) y de lista. */

export interface DatosPersona {
  nombre: string
  email: string
  cedula: string
  telefono?: string
}

/** Respuesta de la API: `datos` trae el JSON (o null) y `codigo` el error del contrato ({ error }). */
export interface RespuestaApi<T> {
  ok: boolean
  datos: T | null
  codigo: string | null
}

const PREFIJO_API = '/api'

function valor(formulario: HTMLFormElement, campo: keyof DatosPersona): string {
  return String(new FormData(formulario).get(campo) ?? '').trim()
}

export function leerPersona(formulario: HTMLFormElement): DatosPersona {
  const telefono = valor(formulario, 'telefono')
  return {
    nombre: valor(formulario, 'nombre'),
    email: valor(formulario, 'email'),
    cedula: valor(formulario, 'cedula'),
    ...(telefono ? { telefono } : {}),
  }
}

/** POST JSON a /api (puente Astro → Fastify). Nunca lanza: los fallos de red llegan como codigo 'SinConexion'. */
export async function enviarJson<T>(ruta: string, cuerpo: unknown): Promise<RespuestaApi<T>> {
  try {
    const respuesta = await fetch(`${PREFIJO_API}${ruta}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    const datos: unknown = await respuesta.json().catch(() => null)
    const codigo = typeof datos === 'object' && datos && 'error' in datos ? String(datos.error) : null
    return { ok: respuesta.ok, datos: respuesta.ok ? (datos as T) : null, codigo: respuesta.ok ? null : codigo ?? 'Desconocido' }
  } catch {
    return { ok: false, datos: null, codigo: 'SinConexion' }
  }
}

const MENSAJES_COMUNES: Record<string, string> = {
  ValidationError: 'Revisa tus datos: la cédula va sin puntos y el celular solo con números.',
  SinConexion: 'No hay conexión. Revisa tu internet e inténtalo de nuevo.',
  'Too Many Requests': 'Demasiados intentos seguidos. Espera un momento.',
}
const MENSAJE_GENERICO = 'Algo salió mal. Inténtalo de nuevo o escríbenos por WhatsApp.'

export function mensajeDeError(codigo: string | null, propios: Record<string, string> = {}): string {
  if (!codigo) return MENSAJE_GENERICO
  return propios[codigo] ?? MENSAJES_COMUNES[codigo] ?? MENSAJE_GENERICO
}

/** Bloquea el botón de envío mientras la petición está en curso. */
export async function conEnvioEnCurso<T>(formulario: HTMLFormElement, tarea: () => Promise<T>): Promise<T> {
  const boton = formulario.querySelector<HTMLButtonElement>('[type="submit"]')
  formulario.setAttribute('aria-busy', 'true')
  if (boton) boton.disabled = true
  try {
    return await tarea()
  } finally {
    formulario.removeAttribute('aria-busy')
    if (boton) boton.disabled = false
  }
}
