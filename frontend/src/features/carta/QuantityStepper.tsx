import { Minus, Plus } from 'lucide-react'

interface QuantityStepperProps {
  label: string
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
}

const BUTTON_CLASS =
  'w-8 h-8 rounded-lg flex items-center justify-center bg-skpat-oro text-skpat-bg disabled:opacity-30 hover:bg-skpat-bronce transition-colors'

/** Control +/− de cantidad; `label` nombra el producto para lectores de pantalla y pruebas. */
export function QuantityStepper({ label, quantity, onIncrement, onDecrement }: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button type="button" className={BUTTON_CLASS} onClick={onDecrement} disabled={quantity === 0} aria-label={`Quitar ${label}`}>
        <Minus size={14} />
      </button>
      <span className="w-5 text-center text-sm font-bold text-skpat-white" aria-label={`Cantidad de ${label}`}>
        {quantity}
      </span>
      <button type="button" className={BUTTON_CLASS} onClick={onIncrement} aria-label={`Agregar ${label}`}>
        <Plus size={14} />
      </button>
    </div>
  )
}
