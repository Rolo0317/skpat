import { groupBy } from '@/lib/collections'
import { formatCOP } from '@/lib/format'
import type { MenuItem } from './menu'
import { QuantityStepper } from './QuantityStepper'

interface MenuCategoryListProps {
  items: MenuItem[]
  quantityOf: (productId: string) => number
  onAdd: (item: MenuItem) => void
  onRemove: (productId: string) => void
}

/** Carta agrupada por categoría con selector de cantidad por producto. */
export function MenuCategoryList({ items, quantityOf, onAdd, onRemove }: MenuCategoryListProps) {
  const categories = Object.entries(groupBy(items, (item) => item.category))

  return (
    <div className="space-y-7">
      {categories.map(([category, categoryItems]) => (
        <section key={category}>
          <h2 className="text-[11px] font-bold text-skpat-oro uppercase tracking-[2px] mb-3 pb-2 border-b border-skpat-oro/20">
            {category}
          </h2>
          <ul className="space-y-2">
            {categoryItems.map((item) => (
              <li key={item.id} className="bg-skpat-card border border-skpat-border rounded-xl px-4 py-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-skpat-white">{item.name}</div>
                  {item.description && <div className="text-[11px] text-skpat-muted mt-0.5">{item.description}</div>}
                  <div className="text-sm font-extrabold text-skpat-green mt-1">{formatCOP(item.price_cents)}</div>
                </div>
                <QuantityStepper
                  label={item.name}
                  quantity={quantityOf(item.id)}
                  onIncrement={() => onAdd(item)}
                  onDecrement={() => onRemove(item.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
