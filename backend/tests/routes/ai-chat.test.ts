import { describe, it } from 'vitest'

describe('ai chat routes', () => {
  it.todo('POST /ai/chat returns 200 with Content-Type text/event-stream')
  it.todo('POST /ai/chat without message returns 400')
  it.todo('POST /ai/chat emits data chunks and [DONE]')
  it.todo('POST /ai/chat without ANTHROPIC_API_KEY returns 503')
})
