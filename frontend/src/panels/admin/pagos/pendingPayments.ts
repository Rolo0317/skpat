import { ticketLabel } from '@skpat/backend/src/lib/ticketPrices'
import type {
  PagosPendientes, ReservaPendiente, TiqueteEmitido, TiquetePendiente,
} from '@/lib/operacion'
import { whatsappChatUrl } from '@/lib/whatsapp'

export const PENDING_PAYMENTS_PATH = '/admin/pagos/pendientes'
export const PENDING_PAYMENTS_POLL_MS = 15_000

export type PendingKind = 'tiquete' | 'reserva'
export type PaymentAction = 'confirmar' | 'cancelar'

/** Fila unificada: tiquetes de entrada general y reservas de palco/mesa se gestionan igual. */
export interface PendingItem {
  kind: PendingKind
  id: string
  nombre: string
  email: string
  event_title: string
  event_date: string
  detalle: string
  price_cents: number
  created_at: string
  contactUrl: string | null
}

const RESOURCE_BY_KIND: Record<PendingKind, string> = { tiquete: 'tiquetes', reserva: 'reservas' }

export function paymentActionPath(item: Pick<PendingItem, 'kind' | 'id'>, action: PaymentAction): string {
  return `/admin/pagos/${RESOURCE_BY_KIND[item.kind]}/${item.id}/${action}`
}

function contactUrl(
  source: { telefono?: string | null; whatsapp_url?: string | null },
  nombre: string,
  detalle: string,
  eventTitle: string,
): string | null {
  if (source.whatsapp_url) return source.whatsapp_url
  if (!source.telefono) return null
  return whatsappChatUrl(source.telefono, `Hola ${nombre}, te escribimos de Skpat VIP por tu ${detalle} para ${eventTitle}.`)
}

function ticketDetail(ticket: TiquetePendiente): string {
  const label = ticketLabel(ticket.ticket_type)
  return ticket.price_stage ? `${label} · ${ticket.price_stage}` : label
}

function reservationDetail(reservation: ReservaPendiente): string {
  return `${ticketLabel(reservation.tipo)} ${reservation.numero} · ${reservation.capacidad} personas`
}

function fromTicket(ticket: TiquetePendiente): PendingItem {
  const detalle = ticketDetail(ticket)
  return {
    kind: 'tiquete', id: ticket.id, nombre: ticket.nombre, email: ticket.email, event_title: ticket.event_title,
    event_date: ticket.event_date, detalle, price_cents: ticket.price_cents, created_at: ticket.created_at,
    contactUrl: contactUrl(ticket, ticket.nombre, detalle, ticket.event_title),
  }
}

function fromReservation(reservation: ReservaPendiente): PendingItem {
  const detalle = reservationDetail(reservation)
  return {
    kind: 'reserva', id: reservation.id, nombre: reservation.nombre, email: reservation.email,
    event_title: reservation.event_title, event_date: reservation.event_date, detalle,
    price_cents: reservation.price_cents, created_at: reservation.created_at,
    contactUrl: contactUrl(reservation, reservation.nombre, detalle, reservation.event_title),
  }
}

/** Palcos y mesas primero (más dinero en juego); dentro de cada grupo, el más antiguo primero. */
export function toPendingItems({ tiquetes, reservas }: PagosPendientes): PendingItem[] {
  return [...reservas.map(fromReservation), ...tiquetes.map(fromTicket)]
}

export function pendingCount(data: PagosPendientes | undefined): number {
  return data ? data.tiquetes.length + data.reservas.length : 0
}

/** Confirmar un tiquete devuelve un QR; confirmar una reserva, uno por persona. */
export function issuedTickets(response: unknown): TiqueteEmitido[] {
  const body = response as { tiquetes?: TiqueteEmitido[]; ticket_id?: string; qr_data_url?: string }
  if (Array.isArray(body.tiquetes)) return body.tiquetes
  return body.ticket_id && body.qr_data_url ? [{ ticket_id: body.ticket_id, qr_data_url: body.qr_data_url }] : []
}
