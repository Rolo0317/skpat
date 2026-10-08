import type { FastifyInstance } from 'fastify'
import { createDefaultChatProvider } from '../../services/ai/anthropicProvider.js'
import { loadVenueContext } from '../../services/ai/venueContext.js'
import { chatRoute, type ChatRouteDependencies } from './chat.js'

/** Las dependencias son inyectables para probar sin red; por defecto se usa Anthropic y el contexto cacheado. */
export type AiRoutesOptions = Partial<ChatRouteDependencies>

export async function aiRoutes(app: FastifyInstance, options: AiRoutesOptions = {}) {
  await chatRoute(app, {
    chatProvider: 'chatProvider' in options ? options.chatProvider : createDefaultChatProvider(),
    loadVenueContext: options.loadVenueContext ?? loadVenueContext,
  })
}
