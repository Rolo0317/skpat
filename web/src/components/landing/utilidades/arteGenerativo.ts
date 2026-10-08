/**
 * Arte de respaldo para eventos sin flyer: un patrón único y estable derivado del id.
 * Mismo evento, mismo arte, sin depender de imágenes externas.
 */
const TONOS_NEON = [
  'var(--color-skpat-purple)',
  'var(--color-skpat-pink)',
  'var(--color-skpat-cyan)',
  'var(--color-skpat-purple2)',
] as const

const GRADOS_CIRCULO = 360
const SEMILLA_HASH = 2166136261
const PRIMO_FNV = 16777619
const MAX_PORCENTAJE = 100

export function hashTexto(texto: string): number {
  let hash = SEMILLA_HASH
  for (const caracter of texto) {
    hash ^= caracter.charCodeAt(0)
    hash = Math.imul(hash, PRIMO_FNV)
  }
  return hash >>> 0
}

function tonoEn(hash: number, desplazamiento: number): string {
  return TONOS_NEON[(hash >>> desplazamiento) % TONOS_NEON.length]!
}

/** Variables CSS que el componente de arte usa para pintar gradientes y rayos. */
export function variablesDeArte(semilla: string): string {
  const hash = hashTexto(semilla)
  const angulo = hash % GRADOS_CIRCULO
  const focoX = (hash >>> 3) % MAX_PORCENTAJE
  const focoY = (hash >>> 9) % MAX_PORCENTAJE
  return [
    `--arte-a: ${tonoEn(hash, 2)}`,
    `--arte-b: ${tonoEn(hash, 6)}`,
    `--arte-angulo: ${angulo}deg`,
    `--arte-x: ${focoX}%`,
    `--arte-y: ${focoY}%`,
  ].join('; ')
}
