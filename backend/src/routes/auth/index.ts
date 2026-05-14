import type { FastifyInstance } from 'fastify'
import { registerRoute } from './register.js'
import { loginRoute } from './login.js'
import { recoverRoute } from './recover.js'
import { meRoute } from './me.js'

export async function authRoutes(app: FastifyInstance) {
  await registerRoute(app)
  await loginRoute(app)
  await recoverRoute(app)
  await meRoute(app)
}
