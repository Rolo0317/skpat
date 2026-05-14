import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { env } from './lib/env'

export async function buildServer() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  })

  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin: env.CORS_ORIGINS.split(',').map(s => s.trim()),
    credentials: true,
  })

  app.get('/health', async () => ({ status: 'ok', env: env.NODE_ENV }))

  return app
}

if (process.env.NODE_ENV !== 'test') {
  const app = await buildServer()
  app.listen({ port: env.PORT, host: '0.0.0.0' })
    .then(addr => app.log.info(`Skpat backend listening on ${addr}`))
    .catch(err => {
      app.log.error(err)
      process.exit(1)
    })
}
