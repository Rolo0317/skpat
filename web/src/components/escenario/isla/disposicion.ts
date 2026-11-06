/**
 * Medidas del escenario en metros (1 unidad = 1 m). Las comparten los objetos para que todo encaje:
 * cambiar el ancho de la pantalla mueve también el truss y los cabezales.
 */
export const SALA = {
  /** Borde frontal de la tarima. */
  frenteTarima: -3.2,
  alturaTarima: 0.9,
  fondoTarima: -8.6,
  anchoTarima: 15,
} as const

export const PANTALLA = { ancho: 15, alto: 6.4, z: -8.4, base: 1.3 } as const

export const CABINA = { ancho: 3.8, alto: 1.15, fondo: 1.3, z: -4.6 } as const

export const TRUSS = { y: 8.1, z: -4.4, ancho: 17 } as const

/** Posición x de los cabezales móviles colgados del truss. */
export const CABEZALES_X = [-6.6, -4, -1.35, 1.35, 4, 6.6] as const

export const CAMARA = {
  posicion: [0, 1.8, 8.2] as const,
  mira: [0, 3.1, -5] as const,
  fov: 48,
  /** Desplazamiento máximo del paralaje, en metros. */
  paralaje: { x: 0.75, y: 0.32 } as const,
} as const

export const PUBLICO = { cantidad: 150, zCerca: 6.4, zLejos: -2.6, ancho: 19 } as const
