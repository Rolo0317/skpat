import { formatCOP } from '@/lib/format'
import { lineTotal, type CartLine } from './cart'

/** Mismo límite que valida POST /tables/:number/orders. */
const NOTES_MAX_LENGTH = 300

interface OrderCartProps {
  lines: CartLine[]
  total: number
  notes: string
  sending: boolean
  error: string | null
  onNotesChange: (notes: string) => void
  onSubmit: () => void
}

/** Resumen del pedido de la mesa, fijo al pie de la pantalla mientras haya productos. */
export function OrderCart({ lines, total, notes, sending, error, onNotesChange, onSubmit }: OrderCartProps) {
  return (
    <aside
      data-testid="order-cart"
      className="fixed inset-x-0 bottom-0 z-20 bg-skpat-bg2/95 backdrop-blur border-t border-skpat-oro/30 px-4 py-4"
    >
      <div className="max-w-[480px] mx-auto space-y-3">
        <ul className="max-h-32 overflow-y-auto space-y-1 text-sm">
          {lines.map((line) => (
            <li key={line.menu_item_id} className="flex justify-between text-skpat-text">
              <span>{line.quantity} × {line.name}</span>
              <span className="text-skpat-green font-semibold">{formatCOP(lineTotal(line))}</span>
            </li>
          ))}
        </ul>
        <input
          value={notes}
          maxLength={NOTES_MAX_LENGTH}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Notas para el mesero (opcional)"
          aria-label="Notas para el mesero"
          className="w-full bg-skpat-bg3 border border-skpat-border rounded-lg px-3 py-2 text-sm text-skpat-text placeholder:text-skpat-muted focus:outline-none focus:border-skpat-oro"
        />
        {error && <p role="alert" className="text-skpat-red text-xs">{error}</p>}
        <button
          type="button"
          onClick={onSubmit}
          disabled={sending}
          className="w-full flex justify-between items-center px-4 py-3 rounded-xl font-bold text-white bg-linear-to-br from-skpat-oro to-skpat-champan disabled:opacity-60"
        >
          <span>{sending ? 'Enviando...' : 'Enviar pedido'}</span>
          <span>{formatCOP(total)}</span>
        </button>
      </div>
    </aside>
  )
}
