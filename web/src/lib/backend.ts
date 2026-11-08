import type { FastifyInstance } from 'fastify'
import { buildServer } from '@skpat/backend/app'

let appPromise: Promise<FastifyInstance> | undefined

/** Una sola instancia de Fastify por contenedor serverless: se reutiliza entre invocaciones en caliente. */
export function getBackend(): Promise<FastifyInstance> {
  appPromise ??= buildServer().then(async (app) => {
    await app.ready()
    return app
  })
  return appPromise
}
