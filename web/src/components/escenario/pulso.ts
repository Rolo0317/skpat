/**
 * Reloj musical simulado del escenario: no escucha audio ni pide el micrófono.
 * Todo sale de una función pura del tiempo, así el 3D, el 2.5D y las pruebas comparten el mismo ritmo.
 *
 * Estructura de la frase (16 compases de 4 tiempos):
 * - compases 0 a 7: el drop, energía alta y destello en el primer tiempo;
 * - compases 8 a 11: valle, energía media;
 * - compases 12 a 15: subida, la energía crece y el bombo se dobla en el último compás.
 */
export const BPM_MINIMO = 128
export const BPM_MAXIMO = 150
/** Tempo de la casa: guaracha y electrónica rondan este pulso. */
export const BPM_SKPAT = 140

const TIEMPOS_POR_COMPAS = 4
const COMPASES_POR_FRASE = 16
const TIEMPOS_POR_FRASE = TIEMPOS_POR_COMPAS * COMPASES_POR_FRASE
const FIN_DEL_DROP = 8
const INICIO_SUBIDA = 12
const ENERGIA_DROP = 1
const ENERGIA_VALLE = 0.45
const ENERGIA_TOPE_SUBIDA = 0.9
/** Qué tan rápido se apaga el golpe del bombo dentro de un tiempo (mayor = más seco). */
const CAIDA_DEL_BOMBO = 6
/** El destello del drop dura un compás y cae exponencial. */
const CAIDA_DEL_DESTELLO = 3

export interface EstadoPulso {
  /** Tiempos transcurridos (con decimales). */
  tiempos: number
  /** Posición dentro del tiempo actual, de 0 a 1. */
  fase: number
  /** Envolvente del bombo: 1 en el golpe y cae hacia 0. */
  golpe: number
  /** Compás dentro de la frase, de 0 a 15. */
  compas: number
  /** Avance de la frase completa, de 0 a 1. */
  avanceFrase: number
  /** Energía general de la sección, de 0 a 1. */
  energia: number
  /** Destello del drop: 1 justo al empezar la frase y se apaga en un compás. */
  destello: number
  /** Avance de la subida, de 0 a 1 (0 fuera de la subida). */
  subida: number
}

export function bpmValido(bpm: number): number {
  if (!Number.isFinite(bpm)) return BPM_SKPAT
  return Math.min(BPM_MAXIMO, Math.max(BPM_MINIMO, bpm))
}

export function segundosPorTiempo(bpm: number = BPM_SKPAT): number {
  return 60 / bpmValido(bpm)
}

function envolvente(fase: number, caida: number): number {
  return Math.exp(-caida * fase)
}

function energiaDe(compas: number, subida: number): number {
  if (compas < FIN_DEL_DROP) return ENERGIA_DROP
  if (compas < INICIO_SUBIDA) return ENERGIA_VALLE
  return ENERGIA_VALLE + (ENERGIA_TOPE_SUBIDA - ENERGIA_VALLE) * subida
}

export function estadoPulso(segundos: number, bpm: number = BPM_SKPAT): EstadoPulso {
  const tiempos = Math.max(0, segundos) / segundosPorTiempo(bpm)
  const enFrase = tiempos % TIEMPOS_POR_FRASE
  const compas = Math.floor(enFrase / TIEMPOS_POR_COMPAS)
  const fase = tiempos % 1
  const enSubida = compas >= INICIO_SUBIDA
  const subida = enSubida ? (enFrase - INICIO_SUBIDA * TIEMPOS_POR_COMPAS) / ((COMPASES_POR_FRASE - INICIO_SUBIDA) * TIEMPOS_POR_COMPAS) : 0
  // Redoble: en el último compás el bombo cae en corcheas.
  const faseBombo = compas === COMPASES_POR_FRASE - 1 ? (tiempos * 2) % 1 : fase
  const destello = enFrase < TIEMPOS_POR_COMPAS ? envolvente(enFrase / TIEMPOS_POR_COMPAS, CAIDA_DEL_DESTELLO) : 0
  return {
    tiempos,
    fase,
    golpe: envolvente(faseBombo, CAIDA_DEL_BOMBO),
    compas,
    avanceFrase: enFrase / TIEMPOS_POR_FRASE,
    energia: energiaDe(compas, subida),
    destello,
    subida,
  }
}
