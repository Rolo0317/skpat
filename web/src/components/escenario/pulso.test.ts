import { describe, expect, it } from 'vitest'
import { BPM_MAXIMO, BPM_MINIMO, BPM_SKPAT, bpmValido, estadoPulso, segundosPorTiempo } from './pulso'

const TIEMPO = segundosPorTiempo(BPM_SKPAT)
const COMPAS = TIEMPO * 4

describe('pulso del escenario', () => {
  it('el tempo de la casa está dentro del rango pedido (128 a 150 BPM)', () => {
    expect(BPM_SKPAT).toBeGreaterThanOrEqual(128)
    expect(BPM_SKPAT).toBeLessThanOrEqual(150)
  })

  it('limita cualquier BPM al rango y descarta valores no numéricos', () => {
    expect(bpmValido(90)).toBe(BPM_MINIMO)
    expect(bpmValido(200)).toBe(BPM_MAXIMO)
    expect(bpmValido(Number.NaN)).toBe(BPM_SKPAT)
  })

  it('el bombo golpea en 1 al empezar cada tiempo y cae antes del siguiente', () => {
    expect(estadoPulso(0).golpe).toBeCloseTo(1)
    expect(estadoPulso(TIEMPO * 0.9).golpe).toBeLessThan(0.05)
    expect(estadoPulso(TIEMPO * 3).golpe).toBeCloseTo(1)
  })

  it('arranca en el drop con destello y energía máxima', () => {
    const inicio = estadoPulso(0.001)
    expect(inicio.compas).toBe(0)
    expect(inicio.energia).toBe(1)
    expect(inicio.destello).toBeGreaterThan(0.9)
    expect(estadoPulso(COMPAS * 2).destello).toBe(0)
  })

  it('baja en el valle y crece en la subida hasta volver al drop', () => {
    const valle = estadoPulso(COMPAS * 9.5)
    const subida = estadoPulso(COMPAS * 14)
    expect(valle.energia).toBeLessThan(0.5)
    expect(subida.subida).toBeGreaterThan(0)
    expect(subida.energia).toBeGreaterThan(valle.energia)
    expect(estadoPulso(COMPAS * 16 + 0.001).compas).toBe(0)
  })

  it('en el último compás el bombo se dobla (redoble)', () => {
    const mitadDeTiempo = COMPAS * 15 + TIEMPO * 0.5
    expect(estadoPulso(mitadDeTiempo).golpe).toBeCloseTo(1)
    expect(estadoPulso(COMPAS * 3 + TIEMPO * 0.5).golpe).toBeLessThan(0.1)
  })

  it('no se rompe con tiempos negativos', () => {
    expect(estadoPulso(-5).tiempos).toBe(0)
  })
})
