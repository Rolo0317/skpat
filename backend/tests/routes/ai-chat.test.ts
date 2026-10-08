import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import type { ChatProvider, ChatRequest } from '../../src/services/ai/chatProvider.js'

// Mock Anthropic SDK BEFORE buildServer is imported
vi.mock('@anthropic-ai/sdk', () => {
  class FakeAnthropic {
    constructor(_opts: unknown) {}
    messages = {
      stream: (_args: unknown) => {
        async function* gen() {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hola' } }
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' 🎵' } }
        }
        return gen()
      },
    }
  }
  return { default: FakeAnthropic }
})

// Ensure env has a stub key so the route doesn't return 503
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? 'sk-ant-test-key'
process.env.AI_MODEL = process.env.AI_MODEL ?? 'claude-haiku-4-5-20251001'

const { buildServer } = await import('../../src/app.js')
const { aiRoutes } = await import('../../src/routes/ai/index.js')
const { buildVenueContext } = await import('../../src/services/ai/venueContext.js')
const { createEvent, createMenuItem, resetDb } = await import('../helpers.js')

let app: FastifyInstance

const postChat = (target: FastifyInstance, payload: unknown) =>
  target.inject({ method: 'POST', url: '/ai/chat', payload: payload as object, headers: { 'content-type': 'application/json' } })

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
  await resetDb()
})

afterAll(async () => {
  await resetDb()
  await app.close()
})

describe('POST /ai/chat', () => {
  it('returns 400 when message is missing', async () => {
    expect((await postChat(app, {})).statusCode).toBe(400)
  })

  it('returns 400 when message is empty string', async () => {
    expect((await postChat(app, { message: '' })).statusCode).toBe(400)
  })

  it('returns 400 when history exceeds the allowed size', async () => {
    const history = Array.from({ length: 11 }, () => ({ role: 'user', content: 'hola' }))
    expect((await postChat(app, { message: 'hola', history })).statusCode).toBe(400)
  })

  it('returns 200 with text/event-stream content type and streams data chunks', async () => {
    const res = await postChat(app, { message: '¿A qué horas abren?' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/event-stream/)
    expect(res.body).toMatch(/data: \{"text":"Hola"\}/)
    expect(res.body).toMatch(/data: \{"text":" 🎵"\}/)
    expect(res.body).toMatch(/data: \[DONE\]/)
  })
})

describe('POST /ai/chat with an injected provider', () => {
  let received: ChatRequest | undefined
  const fakeProvider: ChatProvider = {
    async *streamReply(request) {
      received = request
      yield 'Listo'
    },
  }
  const failingProvider: ChatProvider = {
    async *streamReply() {
      yield* []
      throw new Error('upstream down')
    },
  }

  const buildAiApp = async (options: Parameters<typeof aiRoutes>[1]) => {
    const isolated = Fastify()
    await isolated.register(aiRoutes, { prefix: '/ai', ...options })
    return isolated
  }

  beforeEach(() => { received = undefined })

  it('sends live venue context and the conversation history to the provider', async () => {
    const isolated = await buildAiApp({ chatProvider: fakeProvider, loadVenueContext: async () => 'CONTEXTO-VIVO' })
    const history = [
      { role: 'assistant', content: '¡Hola! ¿En qué te ayudo?' },
      { role: 'user', content: '¿Qué eventos hay?' },
      { role: 'assistant', content: 'Este sábado hay guaracha.' },
    ]
    const res = await postChat(isolated, { message: '¿Y cuánto vale?', history })

    expect(res.body).toBe('data: {"text":"Listo"}\n\ndata: [DONE]\n\n')
    expect(received?.system).toContain('CONTEXTO-VIVO')
    expect(received?.messages).toEqual([
      { role: 'user', content: '¿Qué eventos hay?' },
      { role: 'assistant', content: 'Este sábado hay guaracha.' },
      { role: 'user', content: '¿Y cuánto vale?' },
    ])
    await isolated.close()
  })

  it('emits a StreamFailed frame when the provider fails mid-stream', async () => {
    const isolated = await buildAiApp({ chatProvider: failingProvider, loadVenueContext: async () => '' })
    const res = await postChat(isolated, { message: 'hola' })
    expect(res.body).toContain('data: {"error":"StreamFailed"}')
    await isolated.close()
  })

  it('returns 503 when no provider is configured', async () => {
    const isolated = await buildAiApp({ chatProvider: undefined, loadVenueContext: async () => '' })
    const res = await postChat(isolated, { message: 'hola' })
    expect(res.statusCode).toBe(503)
    expect(res.json().error).toBe('AIServiceUnavailable')
    await isolated.close()
  })
})

describe('buildVenueContext', () => {
  it('describes upcoming active events and the active menu by category', async () => {
    await createEvent({ title: 'Guaracha Fest', date: '2099-01-10T03:00:00Z', price: 4000000, available_spots: 42 })
    await createEvent({ title: 'Evento Oculto', date: '2099-01-11T03:00:00Z', is_active: false })
    await createEvent({ title: 'Evento Pasado', date: '2000-01-01T03:00:00Z' })
    await createMenuItem({ name: 'Aguardiente', category: 'licores', price_cents: 9000000 })
    await createMenuItem({ name: 'Producto Inactivo', is_active: false })

    const context = await buildVenueContext()

    expect(context).toContain('Guaracha Fest')
    expect(context).toContain('42 cupos disponibles')
    expect(context).toContain('$40.000 COP')
    expect(context).toContain('licores: Aguardiente $90.000 COP')
    expect(context).not.toContain('Evento Oculto')
    expect(context).not.toContain('Evento Pasado')
    expect(context).not.toContain('Producto Inactivo')
  })
})
