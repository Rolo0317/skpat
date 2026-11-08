/**
 * Siluetas del público para la versión 2.5D, generadas en el servidor (SVG, sin imágenes).
 * Deterministas: la misma semilla da el mismo público, así el HTML es estable entre visitas y en caché.
 */
export interface Silueta {
  cabeza: { cx: number; cy: number; r: number }
  /** Hombros y torso como un rectángulo de puntas redondas. */
  torso: { x: number; y: number; ancho: number; alto: number; radio: number }
  /** Brazos levantados: líneas desde el hombro. */
  brazos: { x1: number; y1: number; x2: number; y2: number; grosor: number }[]
  /** Retraso del rebote, en fracción de tiempo (0 a 1). */
  retraso: number
}

interface Fila {
  cantidad: number
  ancho: number
  alto: number
  escala: number
  semilla: number
}

function aleatorio(semilla: number): () => number {
  let estado = semilla
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296
    return estado / 4294967296
  }
}

export function armarFila({ cantidad, ancho, alto, escala, semilla }: Fila): Silueta[] {
  const azar = aleatorio(semilla)
  const paso = ancho / cantidad
  return Array.from({ length: cantidad }, (_, indice) => {
    const tamano = escala * (0.85 + azar() * 0.3)
    const cx = paso * (indice + 0.5) + (azar() - 0.5) * paso * 0.6
    const hombros = alto - tamano * 46 + azar() * tamano * 8
    const cabeza = { cx, cy: hombros - tamano * 13, r: tamano * 11 }
    const anchoTorso = tamano * 44
    const torso = { x: cx - anchoTorso / 2, y: hombros, ancho: anchoTorso, alto: alto - hombros + 20, radio: tamano * 16 }
    const sorteo = azar()
    const lados = sorteo > 0.8 ? [-1, 1] : sorteo > 0.55 ? [azar() > 0.5 ? 1 : -1] : []
    const brazos = lados.map((lado) => {
      const x1 = cx + lado * anchoTorso * 0.38
      const inclinacion = 0.15 + azar() * 0.35
      return {
        x1,
        y1: hombros + tamano * 6,
        x2: x1 + lado * tamano * 40 * inclinacion,
        y2: hombros - tamano * 52,
        grosor: tamano * 9,
      }
    })
    return { cabeza, torso, brazos, retraso: Math.round(azar() * 100) / 100 }
  })
}
