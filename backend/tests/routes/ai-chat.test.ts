import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'

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

const { buildServer } = await import('../../src/server.js')

let app: FastifyInstance

beforeAll(async () => {
  app = await buildServer()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

describe('POST /ai/chat', () => {
  it('returns 400 when message is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ai/chat',
      payload: {},
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when message is empty string', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ai/chat',
      payload: { message: '' },
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 200 with text/event-stream content type and streams data chunks', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ai/chat',
      payload: { message: '¿A qué horas abren?' },
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/event-stream/)
    // Body contains streamed SSE frames
    expect(res.body).toMatch(/data: \{"text":"Hola"\}/)
    expect(res.body).toMatch(/data: \{"text":" 🎵"\}/)
    expect(res.body).toMatch(/data: \[DONE\]/)
  })
})
