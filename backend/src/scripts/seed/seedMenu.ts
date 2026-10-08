import type { SqlClient } from '../../lib/db.js'
import { DEMO_MENU } from './catalog.js'

export interface SeededMenuItem {
  id: string
  name: string
  price_cents: number
}

/** Idempotente por nombre: los productos existentes conservan precio y stock. */
export async function seedMenu(executor: SqlClient): Promise<{ items: SeededMenuItem[]; created: number }> {
  let created = 0
  for (const [sortOrder, item] of DEMO_MENU.entries()) {
    created += await executor.run(
      `insert into menu_items (name, description, category, price_cents, stock_qty, min_stock, sort_order)
       select $1, $2, $3, $4, $5, $6, $7
        where not exists (select 1 from menu_items where name = $1)`,
      [item.name, item.description, item.category, item.price_cents, item.stock_qty, item.min_stock, sortOrder],
    )
  }
  const items = await executor.many<SeededMenuItem>(
    'select id, name, price_cents from menu_items where name = any($1)',
    [DEMO_MENU.map((item) => item.name)],
  )
  return { items, created }
}
