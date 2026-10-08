import type { Etapa, PrecioVigente } from '@/lib/operacion'
import { formatCOP, formatDateTime } from '@/lib/format'
import { upcomingStages } from './purchase'

interface PriceScheduleProps {
  etapas: Etapa[]
  vigente: PrecioVigente
  /** Precio de taquilla del evento (centavos); 0 = por confirmar. */
  taquillaCents: number
}

const taquillaLabel = (cents: number) => (cents > 0 ? formatCOP(cents) : 'Por confirmar')

/** Precio que se cobra hoy y lo que viene después, para que nadie se sorprenda en la puerta. */
export function PriceSchedule({ etapas, vigente, taquillaCents }: PriceScheduleProps) {
  const siguientes = upcomingStages(etapas, vigente)
  return (
    <div className="rounded-2xl border border-skpat-oro/40 bg-skpat-card p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-skpat-muted">Precio de hoy · {vigente.nombre}</p>
      <p className="mt-1 text-3xl font-black text-skpat-champan" data-testid="precio-vigente">
        {vigente.es_taquilla ? taquillaLabel(vigente.price_cents) : formatCOP(vigente.price_cents)}
      </p>
      {vigente.ends_at && <p className="mt-1 text-xs text-skpat-muted">Hasta {formatDateTime(vigente.ends_at)}</p>}
      <ul className="mt-4 space-y-1 border-t border-skpat-border pt-3 text-sm">
        {siguientes.map((etapa) => (
          <li key={etapa.id} className="flex justify-between gap-3 text-skpat-muted">
            <span>{etapa.nombre}</span><span>{formatCOP(etapa.price_cents)}</span>
          </li>
        ))}
        {!vigente.es_taquilla && (
          <li className="flex justify-between gap-3 text-skpat-muted">
            <span>Taquilla</span><span>{taquillaLabel(taquillaCents)}</span>
          </li>
        )}
      </ul>
    </div>
  )
}
