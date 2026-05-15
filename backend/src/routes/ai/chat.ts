import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { env } from '../../lib/env.js'

const bodySchema = z.object({
  message: z.string().min(1).max(1000),
})

const SYSTEM_PROMPT = `Eres el asistente virtual de Skpat VIP, una discoteca de música electrónica y guaracha en Bogotá, Colombia.

INFORMACIÓN DEL NEGOCIO:
- Horarios: Viernes y Sábados 9:00 PM – 4:00 AM. Domingos especiales: 8:00 PM – 2:00 AM.
- Ubicación: Cra. 15 #93-47, Bogotá, Colombia (Nueva ubicación 2025).
- Contacto: +57 300 000 0000 · Instagram @skpat.vip

PRECIOS DE ENTRADA (por persona):
- Tarifa madrugador (antes 10:00 PM): $20.000 COP
- Tarifa regular (10:00 PM – 11:30 PM): $30.000 COP
- Tarifa noche alta (después 11:30 PM): $40.000 COP

PALCOS VIP:
- Palco Silver: $450.000 COP — hasta 6 personas, 2 botellas incluidas
- Palco Gold: $850.000 COP — hasta 10 personas, 4 botellas + servicio (MÁS POPULAR)
- Palco Platinum: $1.500.000 COP — hasta 15 personas, bar abierto + servicio dedicado

REGLAS:
- Responde SOLO preguntas relacionadas con Skpat VIP, sus eventos, ubicación, horarios, precios y palcos.
- Si te preguntan algo fuera de ese alcance, sugiérele al usuario contactar al equipo por Instagram @skpat.vip.
- Sé amable, breve (máximo 3 oraciones) y usa emojis ocasionalmente 🎵✨🥂
- Responde siempre en español colombiano.`

export async function chatRoute(app: FastifyInstance) {
  app.post(
    '/chat',
    {
      config: {
        rateLimit: { max: 20, timeWindow: '1 minute' },
      },
    },
    async (req, reply) => {
      if (!env.ANTHROPIC_API_KEY) {
        return reply.code(503).send({ error: 'AIServiceUnavailable' })
      }

      const parsed = bodySchema.safeParse(req.body)
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'ValidationError', issues: parsed.error.issues })
      }

      const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      })

      try {
        const stream = anthropic.messages.stream({
          model: env.AI_MODEL,
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: parsed.data.message }],
        })

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            reply.raw.write(
              `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
            )
          }
        }
        reply.raw.write('data: [DONE]\n\n')
        reply.raw.end()
      } catch (err) {
        req.log.error({ err }, 'Anthropic stream failed')
        try {
          reply.raw.write(
            `data: ${JSON.stringify({ error: 'StreamFailed' })}\n\n`
          )
          reply.raw.end()
        } catch {
          // ignore write errors after headers sent
        }
      }
    }
  )
}
