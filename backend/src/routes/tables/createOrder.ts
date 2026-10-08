import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { tableOrderRateLimitConfig } from '../../plugins/rateLimiter.js'
import { menuLineSchema } from '../../services/menu.js'
import { placeTableOrder } from '../../services/tableOrders.js'
import { parseOrThrow } from '../../services/validation.js'

const MAX_LINES_PER_ORDER = 30

const tableParamsSchema = z.object({ number: z.coerce.number().int().positive() })

const tableOrderSchema = z.object({
  items: z.array(menuLineSchema).min(1).max(MAX_LINES_PER_ORDER),
  notes: z.string().trim().max(300).optional(),
})

export async function createTableOrderRoute(app: FastifyInstance) {
  // Público: el cliente pide desde la carta que abre el QR de su mesa.
  app.post('/tables/:number/orders', { config: { rateLimit: tableOrderRateLimitConfig } }, async (req, reply) => {
    const { number } = parseOrThrow(tableParamsSchema, req.params)
    const { items, notes } = parseOrThrow(tableOrderSchema, req.body)
    const order = await placeTableOrder({ tableNumber: number, items, notes })
    return reply.code(201).send(order)
  })
}
