import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing } from 'lucide-react'
import { formatCOP } from '@/lib/format'
import { fetchOpenOrders, updateOrder, type OrderUpdate, type TableOrder } from '@/features/orders/ordersApi'
import { DEFAULT_PAYMENT_METHOD, PAYMENT_METHODS, type PaymentMethod } from '@/features/orders/paymentMethods'

export const ORDERS_POLL_INTERVAL_MS = 5_000
const OPEN_ORDERS_QUERY_KEY = ['orders', 'open'] as const

const STATUS_LABELS: Record<TableOrder['status'], string> = {
  pending: 'Nuevo',
  attending: 'En atención',
  done: 'Entregado',
  cancelled: 'Cancelado',
}

const ACTION_BUTTON = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50'

function formatOrderTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

interface OrderCardProps {
  order: TableOrder
  busy: boolean
  onUpdate: (update: OrderUpdate) => void
}

function OrderCard({ order, busy, onUpdate }: OrderCardProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD)

  return (
    <li data-testid="pending-order" className="bg-skpat-card border border-skpat-border rounded-xl p-4">
      <div className="flex justify-between items-start gap-3 mb-2">
        <div>
          <div className="font-bold text-skpat-white">Mesa {order.table_number}</div>
          <div className="text-[11px] text-skpat-muted">
            {formatOrderTime(order.created_at)} · {STATUS_LABELS[order.status]}
          </div>
        </div>
        <div className="font-extrabold text-skpat-green">{formatCOP(order.total_cents)}</div>
      </div>
      <ul className="text-sm text-skpat-text mb-2">
        {order.items.map((item) => (
          <li key={item.menu_item_id}>{item.quantity} × {item.name}</li>
        ))}
      </ul>
      {order.notes && <p className="text-xs text-skpat-gold mb-2">Nota: {order.notes}</p>}
      <div className="flex flex-wrap gap-2 items-center">
        {order.status === 'pending' && (
          <button type="button" disabled={busy} onClick={() => onUpdate({ status: 'attending' })} className={`${ACTION_BUTTON} bg-skpat-oro text-skpat-bg`}>
            Atender
          </button>
        )}
        <select
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
          aria-label={`Método de pago mesa ${order.table_number}`}
          className="bg-skpat-bg3 border border-skpat-border rounded-lg px-2 py-1.5 text-xs text-skpat-text"
        >
          {PAYMENT_METHODS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdate({ status: 'done', payment_method: paymentMethod })}
          className={`${ACTION_BUTTON} bg-skpat-green/15 text-skpat-green border border-skpat-green/30`}
        >
          Entregar y cobrar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdate({ status: 'cancelled' })}
          className={`${ACTION_BUTTON} bg-skpat-red/10 text-skpat-red border border-skpat-red/25`}
        >
          Cancelar
        </button>
      </div>
    </li>
  )
}

/** Pedidos hechos desde la carta de las mesas, refrescados periódicamente. */
export function PendingOrders() {
  const queryClient = useQueryClient()
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: OPEN_ORDERS_QUERY_KEY,
    queryFn: fetchOpenOrders,
    refetchInterval: ORDERS_POLL_INTERVAL_MS,
  })
  const changeStatus = useMutation({
    mutationFn: ({ orderId, update }: { orderId: string; update: OrderUpdate }) => updateOrder(orderId, update),
    onSettled: () => queryClient.invalidateQueries({ queryKey: OPEN_ORDERS_QUERY_KEY }),
  })

  return (
    <section aria-labelledby="pending-orders-title" className="mb-5">
      <h2 id="pending-orders-title" className="flex items-center gap-2 font-bold text-sm text-skpat-white mb-3">
        <BellRing size={14} className="text-skpat-oro" />
        Pedidos de mesas
        <span className="text-xs text-skpat-muted font-normal">({orders.length})</span>
      </h2>
      {isLoading && <p className="text-skpat-muted text-sm">Cargando pedidos...</p>}
      {isError && <p className="text-skpat-red text-sm">No se pudieron cargar los pedidos</p>}
      {changeStatus.isError && <p role="alert" className="text-skpat-red text-sm mb-2">No se pudo actualizar el pedido</p>}
      {!isLoading && !isError && orders.length === 0 && (
        <p className="text-skpat-muted text-sm">No hay pedidos pendientes.</p>
      )}
      <ul className="space-y-3">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            busy={changeStatus.isPending && changeStatus.variables?.orderId === order.id}
            onUpdate={(update) => changeStatus.mutate({ orderId: order.id, update })}
          />
        ))}
      </ul>
    </section>
  )
}
