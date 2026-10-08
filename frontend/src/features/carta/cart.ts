import { useCallback, useMemo, useState } from 'react'
import type { MenuItem } from './menu'

export interface CartLine {
  menu_item_id: string
  name: string
  price_cents: number
  quantity: number
}

type CartProduct = Pick<MenuItem, 'id' | 'name' | 'price_cents'>

function addOne(lines: CartLine[], product: CartProduct): CartLine[] {
  const exists = lines.some((line) => line.menu_item_id === product.id)
  if (!exists) {
    return [...lines, { menu_item_id: product.id, name: product.name, price_cents: product.price_cents, quantity: 1 }]
  }
  return lines.map((line) => (line.menu_item_id === product.id ? { ...line, quantity: line.quantity + 1 } : line))
}

function removeOne(lines: CartLine[], productId: string): CartLine[] {
  return lines
    .map((line) => (line.menu_item_id === productId ? { ...line, quantity: line.quantity - 1 } : line))
    .filter((line) => line.quantity > 0)
}

export function lineTotal(line: CartLine): number {
  return line.price_cents * line.quantity
}

function cartTotal(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0)
}

export function toOrderItems(lines: readonly CartLine[]) {
  return lines.map(({ menu_item_id, quantity }) => ({ menu_item_id, quantity }))
}

/** Carrito con cantidades por producto. */
export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([])

  const add = useCallback((product: CartProduct) => setLines((prev) => addOne(prev, product)), [])
  const decrement = useCallback((productId: string) => setLines((prev) => removeOne(prev, productId)), [])
  const remove = useCallback(
    (productId: string) => setLines((prev) => prev.filter((line) => line.menu_item_id !== productId)),
    []
  )
  const clear = useCallback(() => setLines([]), [])
  const quantityOf = useCallback(
    (productId: string) => lines.find((line) => line.menu_item_id === productId)?.quantity ?? 0,
    [lines]
  )
  const total = useMemo(() => cartTotal(lines), [lines])

  return { lines, total, add, decrement, remove, clear, quantityOf }
}
