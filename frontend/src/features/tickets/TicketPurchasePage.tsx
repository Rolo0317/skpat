import { useState, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { apiAssetUrl } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useEventOffer, useEvents } from '@/features/events/queries'
import { FullPageRedirect } from '@/routes/FullPageRedirect'
import type { SkpatEvent } from '@/features/landing/types'
import { PriceSchedule } from './PriceSchedule'
import { PurchaseForm } from './PurchaseForm'
import { PendingPaymentScreen } from './PendingPaymentScreen'
import { isOnlineSaleOpen, type PurchaseResult } from './purchase'

/** Las listas se manejan desde la landing (/lista/<slug>); este flujo es solo entrada general. */
const LIST_TICKET_TYPE = 'lista'
const LANDING_ENTRY_SECTION = '/#entrada'

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-skpat-bg text-skpat-text">
      <nav className="sticky top-0 z-10 flex items-center gap-4 border-b border-skpat-border bg-skpat-bg/80 px-4 py-4 backdrop-blur">
        <a href="/" className="text-sm text-skpat-oro hover:text-skpat-champan">← Skpat VIP</a>
        <span className="text-xs text-skpat-muted">Entrada general</span>
      </nav>
      <main className="mx-auto max-w-xl px-4 py-8">{children}</main>
    </div>
  )
}

function EventSummary({ event }: { event: SkpatEvent }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-skpat-border bg-skpat-card p-4">
      {event.image_url && <img src={apiAssetUrl(event.image_url)} alt={`Flyer de ${event.title}`} className="size-20 shrink-0 rounded-lg object-cover" />}
      <div className="min-w-0">
        <h2 className="text-xl font-extrabold text-skpat-white">{event.title}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-skpat-champan">
          <CalendarDays size={14} aria-hidden="true" /> {formatDateTime(event.date)}
        </p>
        {event.description && <p className="mt-1 text-xs text-skpat-muted">{event.description}</p>}
      </div>
    </div>
  )
}

function Message({ text }: { text: string }) {
  return (
    <div className="space-y-4 py-16 text-center">
      <p className="text-lg text-skpat-text">{text}</p>
      <a href="/" className="text-sm text-skpat-oro hover:text-skpat-champan">← Volver al inicio</a>
    </div>
  )
}

export default function TicketPurchasePage() {
  const { event_id } = useParams<{ event_id: string }>()
  const [searchParams] = useSearchParams()
  const { events, isLoading: loadingEvents, isError: eventsFailed } = useEvents()
  const offer = useEventOffer(event_id)
  const [purchase, setPurchase] = useState<{ result: PurchaseResult; email: string } | null>(null)

  if (searchParams.get('tipo') === LIST_TICKET_TYPE) return <FullPageRedirect to={LANDING_ENTRY_SECTION} />

  const event = events.find((candidate) => candidate.id === event_id)
  const content = (() => {
    if (purchase) return <PendingPaymentScreen result={purchase.result} email={purchase.email} />
    if (loadingEvents || offer.isLoading) return <p className="py-16 text-center text-skpat-muted">Cargando evento…</p>
    if (eventsFailed) return <Message text="No se pudo cargar el evento. Intenta de nuevo." />
    if (!event || !event_id) return <Message text="Evento no encontrado" />
    if (!offer.data) return <Message text="No se pudo cargar el precio de la entrada." />
    const vigente = offer.data.precio_vigente
    return (
      <div className="space-y-6">
        <EventSummary event={event} />
        <PriceSchedule etapas={offer.data.etapas} vigente={vigente} taquillaCents={event.price} />
        <div>
          <h1 className="text-2xl font-black text-skpat-white">Compra tu entrada</h1>
          <p className="mt-1 text-sm text-skpat-muted">Apártala ahora al precio de hoy y paga por WhatsApp con un gestor.</p>
        </div>
        {isOnlineSaleOpen(vigente) ? (
          <PurchaseForm eventId={event_id} priceCents={vigente.price_cents}
            onPurchased={(result, buyer) => setPurchase({ result, email: buyer.email })} />
        ) : (
          <p className="rounded-lg border border-skpat-oro/30 bg-skpat-oro/10 p-4 text-sm text-skpat-champan">
            La preventa terminó. El precio de taquilla está por confirmar: síguenos en redes para enterarte.
          </p>
        )}
      </div>
    )
  })()

  return <PageShell>{content}</PageShell>
}
