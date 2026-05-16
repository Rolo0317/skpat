import type { FastifyInstance } from 'fastify'
import { db } from '../../lib/db.js'
import { verifyAuth, requireRole } from '../../plugins/auth.js'

export async function inventoryRoutes(app: FastifyInstance) {
  // GET /inventory — all menu items with stock info (admin only)
  app.get('/', { preHandler: [verifyAuth, requireRole('admin')] }, async (_req, reply) => {
    const items = db.prepare(`
      SELECT id, name, category, price_cents, stock_qty, min_stock, is_active,
             CASE WHEN stock_qty >= 0 AND stock_qty <= min_stock THEN 1 ELSE 0 END as is_low_stock
      FROM menu_items
      ORDER BY category, name
    `).all()
    return reply.send(items)
  })

  // GET /inventory/alerts — only items at or below minimum stock
  app.get('/alerts', { preHandler: [verifyAuth, requireRole('admin')] }, async (_req, reply) => {
    const alerts = db.prepare(`
      SELECT id, name, category, stock_qty, min_stock
      FROM menu_items
      WHERE stock_qty >= 0 AND stock_qty <= min_stock AND is_active = 1
      ORDER BY (min_stock - stock_qty) DESC
    `).all()
    return reply.send({ count: (alerts as unknown[]).length, items: alerts })
  })

  // PUT /inventory/:id/stock — set stock_qty and/or min_stock (admin)
  app.put('/:id/stock', { preHandler: [verifyAuth, requireRole('admin')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as { stock_qty?: number; min_stock?: number }

    const item = db.prepare('SELECT id FROM menu_items WHERE id = ?').get(id)
    if (!item) return reply.code(404).send({ error: 'MenuItemNotFound' })

    if (body.stock_qty !== undefined) {
      db.prepare('UPDATE menu_items SET stock_qty = ?, updated_at = unixepoch() WHERE id = ?').run(body.stock_qty, id)
    }
    if (body.min_stock !== undefined) {
      db.prepare('UPDATE menu_items SET min_stock = ?, updated_at = unixepoch() WHERE id = ?').run(body.min_stock, id)
    }

    const updated = db.prepare(
      'SELECT id, name, stock_qty, min_stock FROM menu_items WHERE id = ?'
    ).get(id)
    return reply.send(updated)
  })
}
