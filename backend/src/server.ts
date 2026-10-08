import { buildServer } from './app.js'
import { env } from './lib/env.js'

/** Punto de entrada para correr la API como servidor Node (local, Railway, Render). En Vercel la monta Astro. */
const app = await buildServer()
app.listen({ port: env.PORT, host: '0.0.0.0' })
  .then((address) => app.log.info(`Skpat backend listening on ${address}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
