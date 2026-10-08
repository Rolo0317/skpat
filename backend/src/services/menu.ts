import { z } from 'zod'
import { db, HttpError, type SqlClient } from '../lib/db.js'
import { isUuid } from '../lib/ids.js'

export interface ActiveMenuItem {
  id: string
  name: string
  description: string | null
  category: string
  price_cents: number
  sort_order: number
}

const MAX_UNITS_PER_LINE = 100

/** Línea pedida por un cliente o mesero; el precio nunca viene del cliente. */
export const menuLineSchema = z.object({
  menu_item_id: z.string().min(1),
  quantity: z.number().int().positive().max(MAX_UNITS_PER_LINE).default(1),
})

export type MenuLineRequest = z.infer<typeof menuLineSchema>

export interface PricedLine {
  menu_item_id: string
  item_name: string
  item_price_cents: number
  quantity: number
  subtotal_cents: number
}

interface MenuItemPriceRow { id: string; name: string; price_cents: number; is_active: boolean }

export function listActiveMenu(): Promise<ActiveMenuItem[]> {
  return db.many<ActiveMenuItem>(
    `select id, name, description, category, price_cents, sort_order
       from menu_items where is_active
      order by category, sort_order, name`,
  )
}

const menuItemNotFound = (itemId: string) => new HttpError(404, 'MenuItemNotFound', { item_id: itemId })

function toPricedLine(line: MenuLineRequest, item: MenuItemPriceRow | undefined): PricedLine {
  if (!item) throw menuItemNotFound(line.menu_item_id)
  if (!item.is_active) throw new HttpError(422, 'MenuItemInactive', { item_id: line.menu_item_id })
  return {
    menu_item_id: item.id,
    item_name: item.name,
    item_price_cents: item.price_cents,
    quantity: line.quantity,
    subtotal_cents: item.price_cents * line.quantity,
  }
}

/** Valida las líneas contra la carta activa y les pone el precio vigente del servidor (una sola consulta). */
export async function priceMenuLines(client: SqlClient, lines: MenuLineRequest[]): Promise<PricedLine[]> {
  const malformed = lines.find((line) => !isUuid(line.menu_item_id))
  if (malformed) throw menuItemNotFound(malformed.menu_item_id)

  const ids = [...new Set(lines.map((line) => line.menu_item_id.toLowerCase()))]
  const items = await client.many<MenuItemPriceRow>(
    `select id, name, price_cents, is_active from menu_items
      where id in (select jsonb_array_elements_text($1::jsonb)::uuid)`,
    [JSON.stringify(ids)],
  )
  const itemsById = new Map(items.map((item) => [item.id, item]))
  return lines.map((line) => toPricedLine(line, itemsById.get(line.menu_item_id.toLowerCase())))
}

export const totalCentsOf = (lines: PricedLine[]) => lines.reduce((sum, line) => sum + line.subtotal_cents, 0)
