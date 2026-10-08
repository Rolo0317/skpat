import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { isUuid } from '../../lib/ids.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { BUSINESS_PERIOD_NAMES, localHourSql, periodStart } from '../../services/businessHours.js'
import {
  findRevenueTotals, findSalesByMesero, findTopSellingItems, REVENUE_SOURCES, revenueSince,
} from '../../services/salesReports.js'
import { parseOrThrow } from '../../services/validation.js'

const TOP_ITEMS_LIMIT = 10
const MILLISECONDS_PER_SECOND = 1000
const LAST_HOUR_OF_DAY = 23

const uuidFilter = z.string().refine(isUuid, 'Must be a valid id').optional()

// Un periodo desconocido equivale a "todo el histórico", como en la versión anterior.
const summaryQuerySchema = z.object({
  period: z.enum(BUSINESS_PERIOD_NAMES).default('tonight').catch('all'),
  mesero_id: uuidFilter,
  menu_item_id: uuidFilter,
  event_id: uuidFilter,
  hour: z.coerce.number().int().min(0).max(LAST_HOUR_OF_DAY).optional(),
})

type SummaryFilters = z.infer<typeof summaryQuerySchema>

function salesConditions(filters: SummaryFilters, since: Date) {
  return revenueSince('sales', since)
    .addIfPresent((id) => `s.mesero_id = ${id}`, filters.mesero_id)
    .addIfPresent((id) => `exists (select 1 from sale_items si where si.sale_id = s.id and si.menu_item_id = ${id})`, filters.menu_item_id)
    .addIfPresent((hour) => `${localHourSql(REVENUE_SOURCES.sales.occurredAt)} = ${hour}`, filters.hour)
}

function ticketConditions(filters: SummaryFilters, since: Date) {
  return revenueSince('tickets', since)
    .addIfPresent((id) => `t.event_id = ${id}`, filters.event_id)
    .addIfPresent((hour) => `${localHourSql(REVENUE_SOURCES.tickets.occurredAt)} = ${hour}`, filters.hour)
}

export async function summaryRoute(app: FastifyInstance) {
  app.get('/summary', { preHandler: [verifyAuth, requireRole('admin')] }, async (req, reply) => {
    const filters = parseOrThrow(summaryQuerySchema, req.query)
    const since = await periodStart(filters.period)

    const [sales, tickets, topItems, meseros] = await Promise.all([
      findRevenueTotals('sales', salesConditions(filters, since)),
      findRevenueTotals('tickets', ticketConditions(filters, since)),
      findTopSellingItems(since, TOP_ITEMS_LIMIT),
      findSalesByMesero(since),
    ])

    return reply.send({
      period: filters.period,
      start_ts: Math.floor(since.getTime() / MILLISECONDS_PER_SECOND),
      sales,
      tickets,
      grand_total_cents: sales.total_cents + tickets.total_cents,
      top_items: topItems,
      mesero_breakdown: meseros.map(({ mesero_id, ...mesero }) => ({ id: mesero_id, ...mesero })),
    })
  })
}
