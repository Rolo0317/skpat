/**
 * Entrada del paralaje: puntero en escritorio e inclinación del celular, normalizados a [-1, 1].
 * No pide permisos: en iOS la orientación solo llega si el navegador ya la entrega; si no, la escena queda quieta.
 */
export interface Vector2 {
  x: number
  y: number
}

/** Grados de inclinación que equivalen al tope del paralaje. */
const GRADOS_AL_TOPE = 25
/** Inclinación natural al sostener el celular (beta): ahí el paralaje está en cero. */
const BETA_DE_REPOSO = 45

export function limitar(valor: number, minimo = -1, maximo = 1): number {
  if (Number.isNaN(valor)) return 0
  return Math.min(maximo, Math.max(minimo, valor))
}

export function desdePuntero(x: number, y: number, ancho: number, alto: number): Vector2 {
  if (ancho <= 0 || alto <= 0) return { x: 0, y: 0 }
  return { x: limitar((x / ancho) * 2 - 1), y: limitar((y / alto) * 2 - 1) }
}

export function desdeOrientacion(beta: number | null, gamma: number | null): Vector2 {
  if (beta === null || gamma === null) return { x: 0, y: 0 }
  return { x: limitar(gamma / GRADOS_AL_TOPE), y: limitar((beta - BETA_DE_REPOSO) / GRADOS_AL_TOPE) }
}

/** Acerca `actual` a `objetivo` sin depender de los fps: `factor` es la fracción que se recorre por segundo. */
export function suavizar(actual: number, objetivo: number, factor: number, deltaSegundos: number): number {
  const t = 1 - Math.pow(1 - limitar(factor, 0, 0.999), deltaSegundos * 60)
  return actual + (objetivo - actual) * t
}

/**
 * Escucha puntero e inclinación y escribe el último valor en `destino` (sin re-render: lo lee quien anima).
 * Devuelve la función para dejar de escuchar.
 */
export function escucharParalaje(destino: Vector2): () => void {
  const alMover = (evento: PointerEvent) => {
    const valor = desdePuntero(evento.clientX, evento.clientY, window.innerWidth, window.innerHeight)
    destino.x = valor.x
    destino.y = valor.y
  }
  const alInclinar = (evento: DeviceOrientationEvent) => {
    const valor = desdeOrientacion(evento.beta, evento.gamma)
    destino.x = valor.x
    destino.y = valor.y
  }
  window.addEventListener('pointermove', alMover, { passive: true })
  window.addEventListener('deviceorientation', alInclinar, { passive: true })
  return () => {
    window.removeEventListener('pointermove', alMover)
    window.removeEventListener('deviceorientation', alInclinar)
  }
}
