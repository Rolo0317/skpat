import { describe, expect, it } from 'vitest'
import { desdeOrientacion, desdePuntero, limitar, suavizar } from './paralaje'

describe('paralaje', () => {
  it('normaliza el puntero al rango -1 a 1 desde el centro de la ventana', () => {
    expect(desdePuntero(720, 450, 1440, 900)).toEqual({ x: 0, y: 0 })
    expect(desdePuntero(0, 0, 1440, 900)).toEqual({ x: -1, y: -1 })
    expect(desdePuntero(5000, 900, 1440, 900)).toEqual({ x: 1, y: 1 })
  })

  it('no divide por cero con una ventana vacía', () => {
    expect(desdePuntero(10, 10, 0, 0)).toEqual({ x: 0, y: 0 })
  })

  it('toma la inclinación de reposo del celular como centro', () => {
    expect(desdeOrientacion(45, 0)).toEqual({ x: 0, y: 0 })
    expect(desdeOrientacion(90, 60)).toEqual({ x: 1, y: 1 })
    expect(desdeOrientacion(null, 10)).toEqual({ x: 0, y: 0 })
  })

  it('suaviza igual a 30 y a 120 fps en el mismo tiempo total', () => {
    let lento = 0
    let rapido = 0
    for (let i = 0; i < 30; i++) lento = suavizar(lento, 1, 0.1, 1 / 30)
    for (let i = 0; i < 120; i++) rapido = suavizar(rapido, 1, 0.1, 1 / 120)
    expect(lento).toBeCloseTo(rapido, 5)
  })

  it('limitar descarta NaN', () => {
    expect(limitar(Number.NaN)).toBe(0)
  })
})
