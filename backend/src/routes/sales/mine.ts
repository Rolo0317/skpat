import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'
import { NIGHT_START_SQL } from '../../services/businessHours.js'

interface MySaleRow {
  id: string
  table_number: number | null
  payment_method: string
  total_cents: number
  notes: string | null
  sold_at: Date
  items_summary: string | null
}

const findTonightSalesOf = (meseroId: string) =>
  db.many<MySaleRow>(
    `select s.id, s.table_number, s.payment_method, s.total_cents, s.notes, s.sold_at,
            string_agg(si.item_name || ' x' || si.quantity, ', ') as items_summary
       from sales s
       left join sale_items si on si.sale_id = s.id
      where s.mesero_id = $1 and s.sold_at >= ${NIGHT_START_SQL}
      group by s.id
      order by s.sold_at desc`,
    [meseroId],
  )

export async function mySalesRoute(app: FastifyInstance) {
  app.get('/mine', { preHandler: [verifyAuth, requireRole('mesero', 'admin')] }, async (req, reply) => {
    const sales = await findTonightSalesOf(req.user!.id)
    const totalTonightCents = sales.reduce((sum, sale) => sum + sale.total_cents, 0)
    return reply.send({ sales, total_tonight_cents: totalTonightCents })
  })
}
