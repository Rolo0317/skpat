import { Color } from 'three'

/**
 * Colores del rig leídos de los tokens CSS de la web (una sola fuente de verdad).
 * El respaldo solo aplica si la isla se monta sin la hoja de estilos.
 */
const TOKENS = {
  oro: ['--color-skpat-oro', '#d4a63a'],
  champan: ['--color-skpat-champan', '#f2d38a'],
  azul: ['--color-skpat-azul', '#2f80ff'],
  uv: ['--luz-uv', '#5b2bd6'],
  sala: ['--sala', '#08070c'],
} as const

export type NombreColor = keyof typeof TOKENS
export type Paleta = Record<NombreColor, Color>

export function leerPaleta(): Paleta {
  const estilos = getComputedStyle(document.documentElement)
  const entradas = Object.entries(TOKENS).map(([nombre, [token, respaldo]]) => {
    const valor = estilos.getPropertyValue(token).trim()
    return [nombre, new Color(valor || respaldo)]
  })
  return Object.fromEntries(entradas) as Paleta
}
