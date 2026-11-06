import { describe, expect, it } from 'vitest'
import { CONSULTA_ESCENARIO_3D, debeCargar3D } from './capacidad'

describe('capacidad del escenario 3D', () => {
  it('la consulta excluye celulares y movimiento reducido', () => {
    expect(CONSULTA_ESCENARIO_3D).toContain('min-width: 64rem')
    expect(CONSULTA_ESCENARIO_3D).toContain('prefers-reduced-motion: no-preference')
  })

  it('carga en escritorio normal', () => {
    expect(debeCargar3D({ coincideConsulta: true, ahorroDeDatos: false, nucleos: 8 })).toBe(true)
    expect(debeCargar3D({ coincideConsulta: true, ahorroDeDatos: false, nucleos: 0 })).toBe(true)
  })

  it('no carga si la consulta no coincide, si hay ahorro de datos o en equipos de pocos núcleos', () => {
    expect(debeCargar3D({ coincideConsulta: false, ahorroDeDatos: false, nucleos: 8 })).toBe(false)
    expect(debeCargar3D({ coincideConsulta: true, ahorroDeDatos: true, nucleos: 8 })).toBe(false)
    expect(debeCargar3D({ coincideConsulta: true, ahorroDeDatos: false, nucleos: 2 })).toBe(false)
  })
})
