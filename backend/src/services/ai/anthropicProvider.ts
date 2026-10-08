import Anthropic from '@anthropic-ai/sdk'
import { env } from '../../lib/env.js'
import type { ChatProvider, ChatRequest } from './chatProvider.js'

/** Respuestas cortas de concierge: el prompt pide máximo 3 oraciones. */
const MAX_REPLY_TOKENS = 512

export function createAnthropicProvider(apiKey: string, model: string): ChatProvider {
  const client = new Anthropic({ apiKey })
  return {
    async *streamReply({ system, messages }: ChatRequest) {
      const stream = client.messages.stream({ model, max_tokens: MAX_REPLY_TOKENS, system, messages })
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') yield event.delta.text
      }
    },
  }
}

/** Proveedor configurado por entorno; sin API key el chat queda deshabilitado (503). */
export function createDefaultChatProvider(): ChatProvider | undefined {
  return env.ANTHROPIC_API_KEY ? createAnthropicProvider(env.ANTHROPIC_API_KEY, env.AI_MODEL) : undefined
}
