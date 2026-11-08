import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../../src/app.js'

// El chat de IA se retiró (ruta pública sin consumidor que gastaba tokens de pago).
// Esta prueba evita que vuelva a registrarse por accidente.
let app: FastifyInstance

beforeAll(async () => {
  app = await buildServer()
})

afterAll(async () => {
  await app.close()
})

describe('ruta /ai retirada', () => {
  it('POST /ai/chat responde 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ai/chat',
      payload: { message: 'hola' },
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('no queda ninguna ruta bajo /ai', () => {
    // commonPrefix: false imprime cada ruta completa (sin partir /ai en el árbol radix).
    const rutas = app.printRoutes({ commonPrefix: false })
    expect(rutas).toMatch(/events/)
    expect(rutas).not.toMatch(/(^|[\s/])ai(\/|\s|$)/m)
  })
})
