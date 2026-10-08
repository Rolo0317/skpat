import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { createTableOrder } from '@/features/orders/ordersApi'
import { PAYMENT_METHODS } from '@/features/orders/paymentMethods'
import { toOrderItems, useCart } from './cart'
import { useMenu } from './menu'
import { MenuCategoryList } from './MenuCategoryList'
import { OrderCart } from './OrderCart'

const SEND_ERROR = 'No se pudo enviar el pedido. Intenta de nuevo.'

function CartaHeader({ tableNumber }: { tableNumber?: string }) {
  return (
    <header className="sticky top-0 z-10 bg-skpat-bg2 border-b border-skpat-border px-5 py-4">
      <div className="max-w-[480px] mx-auto flex justify-between items-center">
        <div>
          <div className="text-[11px] font-bold text-skpat-purple tracking-[2px] uppercase">
            {tableNumber ? `Mesa ${tableNumber}` : 'Carta Digital'}
          </div>
          <div className="text-[17px] font-extrabold text-skpat-white mt-0.5">Skpat VIP</div>
        </div>
        <div className="text-[11px] text-skpat-muted">Tu mesero confirma el pago</div>
      </div>
    </header>
  )
}

function OrderSentNotice({ onNewOrder }: { onNewOrder: () => void }) {
  return (
    <div role="status" data-testid="order-sent" className="bg-skpat-green/10 border border-skpat-green/30 rounded-xl p-5 text-center mb-6">
      <CheckCircle2 className="mx-auto text-skpat-green mb-2" size={32} />
      <div className="font-bold text-skpat-green">¡Pedido enviado!</div>
      <p className="text-sm text-skpat-muted mt-1">Tu mesero ya lo recibió y va en camino.</p>
      <button type="button" onClick={onNewOrder} className="mt-3 text-sm font-semibold text-skpat-purple underline">
        Hacer otro pedido
      </button>
    </div>
  )
}

function PaymentMethodsInfo() {
  return (
    <div className="bg-skpat-bg2 border border-skpat-border rounded-xl p-4 text-center mt-8">
      <div className="text-xs text-skpat-muted mb-2.5">Formas de pago aceptadas</div>
      <div className="flex gap-2 justify-center flex-wrap">
        {PAYMENT_METHODS.map(({ value, label }) => (
          <span key={value} className="bg-white/5 border border-white/10 px-3 py-1 rounded-md text-xs text-skpat-muted">
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function CartaPage() {
  const { table_number } = useParams<{ table_number: string }>()
  const { data: items = [], isLoading, isError } = useMenu()
  const cart = useCart()
  const [notes, setNotes] = useState('')

  const sendOrder = useMutation({
    mutationFn: () =>
      createTableOrder(table_number ?? '', { items: toOrderItems(cart.lines), notes: notes.trim() || undefined }),
    onSuccess: () => {
      cart.clear()
      setNotes('')
    },
  })

  const canOrder = Boolean(table_number) && cart.lines.length > 0

  return (
    <div className="min-h-screen bg-skpat-bg text-skpat-text pb-56">
      <CartaHeader tableNumber={table_number} />
      <main className="max-w-[480px] mx-auto px-4 py-6">
        {sendOrder.isSuccess && <OrderSentNotice onNewOrder={sendOrder.reset} />}
        {isLoading && <p className="text-skpat-muted text-center mt-10">Cargando carta...</p>}
        {isError && <p className="text-skpat-red text-center mt-10">No se pudo cargar la carta</p>}
        {!isLoading && !isError && items.length === 0 && (
          <p className="text-skpat-muted text-center mt-10">La carta no está disponible en este momento.</p>
        )}
        <MenuCategoryList items={items} quantityOf={cart.quantityOf} onAdd={cart.add} onRemove={cart.decrement} />
        {items.length > 0 && <PaymentMethodsInfo />}
      </main>
      {canOrder && (
        <OrderCart
          lines={cart.lines}
          total={cart.total}
          notes={notes}
          sending={sendOrder.isPending}
          error={sendOrder.isError ? SEND_ERROR : null}
          onNotesChange={setNotes}
          onSubmit={() => sendOrder.mutate()}
        />
      )}
    </div>
  )
}
