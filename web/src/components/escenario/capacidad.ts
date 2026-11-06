/**
 * Cuándo vale la pena el escenario 3D. Fuera de esto se queda la versión 2.5D en capas (HTML y CSS),
 * que ya viene en el HTML y no descarga three.js.
 */
export const CONSULTA_ESCENARIO_3D = '(min-width: 64rem) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

export interface Entorno {
  /** Resultado de CONSULTA_ESCENARIO_3D. */
  coincideConsulta: boolean
  ahorroDeDatos: boolean
  /** Núcleos lógicos (navigator.hardwareConcurrency); 0 si el navegador no lo dice. */
  nucleos: number
}

const NUCLEOS_MINIMOS = 4

export function debeCargar3D({ coincideConsulta, ahorroDeDatos, nucleos }: Entorno): boolean {
  if (!coincideConsulta || ahorroDeDatos) return false
  return nucleos === 0 || nucleos >= NUCLEOS_MINIMOS
}

export function soportaWebGL2(): boolean {
  try {
    const lienzo = document.createElement('canvas')
    return Boolean(lienzo.getContext('webgl2'))
  } catch {
    return false
  }
}
