import { useEventOffer } from '@/features/events/queries'
import { formatCOP } from '@/lib/format'
import { Alert } from '@/components/ui/Alert'
import { apiErrorMessage } from '@/lib/apiErrors'
import { StagesEditor } from './StagesEditor'
import { OffersEditor } from './OffersEditor'

/** Precios de un evento: etapas de la entrada general y ofertas de palco/mesa. */
export function EventSalesPanel({ eventId }: { eventId: string }) {
  const { data, isLoading, error } = useEventOffer(eventId)
  if (isLoading) return <p className="text-sm text-skpat-muted">Cargando precios…</p>
  if (error || !data) return <Alert>{apiErrorMessage(error)}</Alert>

  return (
    <div className="space-y-6 border-t border-skpat-border pt-4">
      <p className="text-sm">
        Precio vigente: <strong className="text-skpat-champan">{data.precio_vigente.nombre} · {formatCOP(data.precio_vigente.price_cents)}</strong>
      </p>
      <StagesEditor eventId={eventId} etapas={data.etapas} />
      <OffersEditor eventId={eventId} ofertas={data.ubicaciones} />
    </div>
  )
}
