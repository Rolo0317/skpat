import { HttpError, type SqlClient } from '../lib/db.js'
import { encrypt } from '../lib/encrypt.js'
import { generateQrToken } from '../lib/qr.js'
import type { TicketType } from '../lib/ticketPrices.js'

/** Estados de un tiquete: las compras pagas nacen pendientes hasta que el staff confirma el pago. */
export type TicketStatus = 'pending_payment' | 'confirmed' | 'cancelled'

export interface EventCapacityRow { id: string; title: string; date: Date; price: number }

const UNIQUE_VIOLATION = '23505'

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === UNIQUE_VIOLATION
}

/**
 * Descuenta un cupo del evento de forma atómica: el UPDATE condicionado evita sobreventa
 * aunque lleguen registros simultáneos (no hay lectura-luego-escritura).
 */
export async function reserveEventCapacity(tx: SqlClient, eventId: string, seats = 1): Promise<EventCapacityRow> {
  const reserved = await tx.one<EventCapacityRow>(
    `update events set available_spots = available_spots - $2
      where id = $1 and is_active and available_spots >= $2
      returning id, title, date, price`,
    [eventId, seats],
  )
  if (reserved) return reserved

  const existing = await tx.one<{ is_active: boolean }>('select is_active from events where id = $1', [eventId])
  if (!existing) throw new HttpError(404, 'EventNotFound')
  throw new HttpError(422, existing.is_active ? 'SoldOut' : 'EventNotActive')
}

export interface NewTicket {
  eventId: string
  userId?: string | null
  nombre: string
  email: string
  /** Se cifra antes de guardarse (AES-256-GCM). */
  cedula: string
  telefono?: string | null
  ticketType: TicketType | 'palco' | 'mesa'
  priceCents: number
  status: TicketStatus
  priceStage?: string | null
  guestListId?: string | null
  promoterId?: string | null
  spotReservationId?: string | null
}

/** Inserta un tiquete con su QR único (un QR por persona). Debe llamarse dentro de una transacción. */
export async function insertTicket(tx: SqlClient, ticket: NewTicket): Promise<{ id: string; qrToken: string }> {
  const qrToken = generateQrToken()
  const row = await tx.one<{ id: string }>(
    `insert into tickets (event_id, user_id, nombre, cedula_enc, email, telefono_enc, qr_token, ticket_type,
                          price_cents, status, price_stage, guest_list_id, promoter_id, spot_reservation_id,
                          confirmed_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
             case when $10 = 'confirmed' then now() end)
     returning id`,
    [
      ticket.eventId, ticket.userId ?? null, ticket.nombre, encrypt(ticket.cedula), ticket.email,
      ticket.telefono ? encrypt(ticket.telefono) : null, qrToken, ticket.ticketType, ticket.priceCents,
      ticket.status, ticket.priceStage ?? null, ticket.guestListId ?? null, ticket.promoterId ?? null,
      ticket.spotReservationId ?? null,
    ],
  )
  return { id: row!.id, qrToken }
}
