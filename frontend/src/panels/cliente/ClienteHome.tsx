import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ticketLabel } from '@skpat/backend/src/lib/ticketPrices'
import { useAuth } from '@/features/auth/useAuth'
import { api } from '@/lib/api'
import { formatCOP, formatDateTime } from '@/lib/format'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import { displayStateOf, TICKET_STATE_PRESENTATION, type MyTicket } from './ticketStatus'

const MY_TICKETS_PATH = '/tickets/mine'

function TicketCard({ ticket }: { ticket: MyTicket }) {
  const [showQr, setShowQr] = useState(false)
  const state = displayStateOf(ticket)
  const { label, badgeClass, help } = TICKET_STATE_PRESENTATION[state]
  const kind = ticket.price_stage ? `${ticketLabel(ticket.ticket_type)} · ${ticket.price_stage}` : ticketLabel(ticket.ticket_type)

  return (
    <li className={`overflow-hidden rounded-2xl border bg-skpat-card ${state === 'valido' ? 'border-skpat-oro/40' : 'border-skpat-border'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="font-bold text-skpat-white">{ticket.event_title}</h2>
          <p className="text-xs text-skpat-muted">{formatDateTime(ticket.event_date)}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="rounded-md bg-skpat-oro/15 px-2 py-0.5 text-skpat-champan">{kind}</span>
            <span className={`rounded-md border px-2 py-0.5 ${badgeClass}`}>{label}</span>
          </div>
        </div>
        <p className="text-lg font-extrabold text-skpat-champan">{formatCOP(ticket.price_cents)}</p>
      </div>
      <div className="space-y-3 border-t border-skpat-border bg-skpat-bg3 px-4 py-3">
        <p className="text-xs text-skpat-muted">{help}</p>
        {state === 'pendiente' && ticket.whatsapp_url && <WhatsAppLink href={ticket.whatsapp_url} label="Pagar por WhatsApp" />}
        {state === 'valido' && ticket.qr_data_url && (
          <>
            <Button variant="secondary" aria-expanded={showQr} onClick={() => setShowQr((open) => !open)}>
              {showQr ? 'Ocultar QR' : 'Ver QR'}
            </Button>
            {showQr && <img src={ticket.qr_data_url} alt={`QR de ${ticket.event_title}`} className="mx-auto size-48 rounded-lg bg-white p-2" />}
          </>
        )}
      </div>
    </li>
  )
}

export default function ClienteHome() {
  const { user } = useAuth()
  const { data: tickets = [], isLoading, isError } = useQuery({
    queryKey: [MY_TICKETS_PATH],
    queryFn: () => api.get<MyTicket[]>(MY_TICKETS_PATH),
  })

  return (
    <section className="mx-auto max-w-2xl p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-skpat-white">Mis tiquetes</h1>
        <p className="text-sm text-skpat-muted">Hola, {user?.nombre ?? user?.email}. Aquí están tus entradas.</p>
      </header>

      {isLoading && <p className="text-skpat-muted">Cargando…</p>}
      {isError && <Alert>No se pudieron cargar tus tiquetes.</Alert>}
      {!isLoading && !isError && tickets.length === 0 && (
        <div className="rounded-2xl border border-skpat-border bg-skpat-card p-8 text-center">
          <p className="mb-4 text-skpat-muted">Aún no tienes tiquetes.</p>
          <a href="/" className="font-semibold text-skpat-oro hover:text-skpat-champan">Ver el evento de esta semana</a>
        </div>
      )}
      <ul className="space-y-4">
        {tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
      </ul>
    </section>
  )
}
