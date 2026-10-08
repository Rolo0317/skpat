import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { aiChatRateLimitConfig } from '../../plugins/rateLimiter.js'
import type { ChatMessage, ChatProvider } from '../../services/ai/chatProvider.js'
import { composeSystemPrompt } from '../../services/ai/systemPrompt.js'
import { parseOrThrow } from '../../services/validation.js'
import { streamTextAsSse } from './sse.js'

const MAX_MESSAGE_LENGTH = 1000
const MAX_HISTORY_MESSAGES = 10

const chatMessageContent = z.string().trim().min(1).max(MAX_MESSAGE_LENGTH)

const bodySchema = z.object({
  message: chatMessageContent,
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: chatMessageContent }))
    .max(MAX_HISTORY_MESSAGES)
    .default([]),
})

export interface ChatRouteDependencies {
  chatProvider: ChatProvider | undefined
  loadVenueContext: () => Promise<string>
}

/** El modelo exige que la conversación empiece con el usuario: se descartan respuestas huérfanas al inicio. */
function toConversation(history: ChatMessage[], message: string): ChatMessage[] {
  const firstUserTurn = history.findIndex((entry) => entry.role === 'user')
  const usableHistory = firstUserTurn === -1 ? [] : history.slice(firstUserTurn)
  return [...usableHistory, { role: 'user', content: message }]
}

export async function chatRoute(app: FastifyInstance, { chatProvider, loadVenueContext }: ChatRouteDependencies) {
  app.post('/chat', { config: { rateLimit: aiChatRateLimitConfig } }, async (req, reply) => {
    if (!chatProvider) return reply.code(503).send({ error: 'AIServiceUnavailable' })

    const { message, history } = parseOrThrow(bodySchema, req.body)
    const system = composeSystemPrompt(await loadVenueContext())
    const textChunks = chatProvider.streamReply({ system, messages: toConversation(history, message) })
    await streamTextAsSse(reply, textChunks, req.log)
  })
}
