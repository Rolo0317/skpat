import type { EstadoPago } from '@/lib/operacion'

/** Tiquete de GET /tickets/mine: QR solo si está confirmado; WhatsApp solo si está pendiente. */
export interface MyTicket {
  id: string
  event_title: string
  event_date: string
  ticket_type: string
  price_cents: number
  price_stage: string | null
  status: EstadoPago
  qr_data_url: string | null
  whatsapp_url: string | null
  qr_used: boolean
  created_at: string
}

export type TicketDisplayState = 'pendiente' | 'valido' | 'usado' | 'cancelado'

export const TICKET_STATE_PRESENTATION: Record<TicketDisplayState, { label: string; badgeClass: string; help: string }> = {
  pendiente: {
    label: 'Pendiente de pago',
    badgeClass: 'border-skpat-oro/40 bg-skpat-oro/15 text-skpat-champan',
    help: 'Cierra el pago por WhatsApp. El QR aparece aquí y en tu correo cuando se confirme.',
  },
  valido: {
    label: 'Confirmado',
    badgeClass: 'border-emerald-700 bg-emerald-950/60 text-emerald-300',
    help: 'Presenta el QR en la puerta. Es personal e intransferible.',
  },
  usado: {
    label: 'Utilizado',
    badgeClass: 'border-white/10 bg-white/5 text-skpat-muted',
    help: 'Este QR ya se usó para entrar.',
  },
  cancelado: {
    label: 'Cancelado',
    badgeClass: 'border-red-900 bg-red-950/60 text-red-300',
    help: 'Esta compra se canceló. Si crees que es un error, escríbenos.',
  },
}

export function displayStateOf(ticket: Pick<MyTicket, 'status' | 'qr_used'>): TicketDisplayState {
  if (ticket.status === 'pending_payment') return 'pendiente'
  if (ticket.status === 'cancelled') return 'cancelado'
  return ticket.qr_used ? 'usado' : 'valido'
}
