import type { OutgoingHttpHeaders } from 'node:http'
import type { FastifyBaseLogger, FastifyReply } from 'fastify'

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
}

const END_OF_STREAM = '[DONE]'

const writeEvent = (reply: FastifyReply, data: string) => reply.raw.write(`data: ${data}\n\n`)

/**
 * Envía fragmentos de texto como Server-Sent Events con el formato que consume el widget:
 * `data: {"text": ...}` por fragmento y `data: [DONE]` al final; si falla, `data: {"error": "StreamFailed"}`.
 */
export async function streamTextAsSse(reply: FastifyReply, chunks: AsyncIterable<string>, log: FastifyBaseLogger) {
  reply.hijack()
  // Conserva las cabeceras ya puestas por los plugins (CORS, helmet) al tomar el control del socket.
  reply.headers(SSE_HEADERS)
  reply.raw.writeHead(200, reply.getHeaders() as OutgoingHttpHeaders)
  try {
    for await (const text of chunks) writeEvent(reply, JSON.stringify({ text }))
    writeEvent(reply, END_OF_STREAM)
  } catch (err) {
    log.error({ err }, 'AI stream failed')
    writeEvent(reply, JSON.stringify({ error: 'StreamFailed' }))
  } finally {
    reply.raw.end()
  }
}
