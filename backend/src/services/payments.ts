import { db, HttpError, type SqlClient } from '../lib/db.js'
import { decrypt } from '../lib/encrypt.js'
import { insertTicket, reserveEventCapacity } from './tickets.js'
import { deliverTicketQr } from './ticketDelivery.js'

type OnEmailError = (err: unknown) => void

interface PendingTicketRow {
  id: string; event_id: string; event_title: string; event_date: Date; nombre: string; email: string
  ticket_type: string; qr_token: string; price_cents: number; price_stage: string | null; created_at: Date
}

interface PendingReservationRow {
  id: string; event_id: string; event_title: string; event_date: Date; spot_id: string; tipo: 'palco' | 'mesa'
  numero: number; capacidad: number; nombre: string; email: string; cedula_enc: string; price_cents: number
  promoter_id: string | null; created_at: Date
}

const PENDING_TICKETS_SQL = `
  select t.id, t.event_id, e.title as event_title, e.date as event_date, t.nombre, t.email, t.ticket_type,
         t.qr_token, t.price_cents, t.price_stage, t.created_at
    from tickets t join events e on e.id = t.event_id
   where t.status = 'pending_payment'`

const PENDING_RESERVATIONS_SQL = `
  select r.id, r.event_id, e.title as event_title, e.date as event_date, r.spot_id, s.tipo, s.numero, s.capacidad,
         r.nombre, r.email, r.cedula_enc, r.price_cents, r.promoter_id, r.created_at
    from spot_reservations r
    join events e on e.id = r.event_id
    join venue_spots s on s.id = r.spot_id
   where r.status = 'pending_payment'`

export async function listPendingPayments() {
  const [tiquetes, reservas] = await Promise.all([
    db.many<PendingTicketRow>(`${PENDING_TICKETS_SQL} order by t.created_at`),
    db.many<PendingReservationRow>(`${PENDING_RESERVATIONS_SQL} order by r.created_at`),
  ])
  return {
    tiquetes: tiquetes.map(({ qr_token: _qrToken, ...ticket }) => ticket),
    reservas: reservas.map(({ cedula_enc: _cedula, ...reservation }) => reservation),
  }
}

/** Distingue "no existe" de "ya procesado" cuando el UPDATE condicionado no afectó filas. */
async function failNotPending(executor: SqlClient, table: 'tickets' | 'spot_reservations', id: string): Promise<never> {
  const exists = await executor.one(`select 1 from ${table} where id = $1`, [id])
  throw exists ? new HttpError(409, 'AlreadyProcessed') : new HttpError(404, 'NotFound')
}

export async function confirmTicket(ticketId: string, adminId: string, onEmailError: OnEmailError) {
  const ticket = await db.one<PendingTicketRow>(
    `update tickets t set status = 'confirmed', confirmed_at = now(), confirmed_by = $2
       from events e
      where t.id = $1 and t.status = 'pending_payment' and e.id = t.event_id
      returning t.id, t.event_id, e.title as event_title, e.date as event_date, t.nombre, t.email,
                t.ticket_type, t.qr_token, t.price_cents, t.price_stage, t.created_at`,
    [ticketId, adminId],
  )
  if (!ticket) return failNotPending(db, 'tickets', ticketId)
  const qr_data_url = await deliverTicketQr(
    {
      email: ticket.email, nombre: ticket.nombre, eventTitle: ticket.event_title, eventDate: ticket.event_date,
      ticketType: ticket.ticket_type, qrToken: ticket.qr_token,
    },
    onEmailError,
  )
  return { ticket_id: ticket.id, status: 'confirmed' as const, qr_data_url }
}

/** Cancela una compra pendiente y devuelve su cupo al evento. */
export async function cancelTicket(ticketId: string) {
  return db.transaction(async (tx) => {
    const cancelled = await tx.one<{ event_id: string }>(
      `update tickets set status = 'cancelled' where id = $1 and status = 'pending_payment' returning event_id`,
      [ticketId],
    )
    if (!cancelled) return failNotPending(tx, 'tickets', ticketId)
    await tx.run('update events set available_spots = available_spots + 1 where id = $1', [cancelled.event_id])
    return { ticket_id: ticketId, status: 'cancelled' as const }
  })
}

const guestName = (titular: string, position: number, total: number) =>
  position === 1 ? titular : `${titular} · invitado ${position - 1} de ${total - 1}`

async function lockPendingReservation(tx: SqlClient, reservationId: string, adminId: string) {
  const confirmed = await tx.run(
    `update spot_reservations set status = 'confirmed', confirmed_at = now(), confirmed_by = $2
      where id = $1 and status = 'pending_payment'`,
    [reservationId, adminId],
  )
  if (confirmed === 0) return failNotPending(tx, 'spot_reservations', reservationId)
  const reservation = await tx.one<PendingReservationRow>(
    PENDING_RESERVATIONS_SQL.replace(`where r.status = 'pending_payment'`, 'where r.id = $1'),
    [reservationId],
  )
  return reservation!
}

/** Confirma un palco o mesa: descuenta el cupo y emite un QR por persona a nombre del titular. */
export async function confirmReservation(reservationId: string, adminId: string, onEmailError: OnEmailError) {
  const { reservation, tickets } = await db.transaction(async (tx) => {
    const reservation = await lockPendingReservation(tx, reservationId, adminId)
    await reserveEventCapacity(tx, reservation.event_id, reservation.capacidad)
    const cedula = decrypt(reservation.cedula_enc)
    const pricePerPerson = Math.round(reservation.price_cents / reservation.capacidad)
    const tickets = []
    for (let position = 1; position <= reservation.capacidad; position++) {
      tickets.push(await insertTicket(tx, {
        eventId: reservation.event_id, nombre: guestName(reservation.nombre, position, reservation.capacidad),
        email: reservation.email, cedula, ticketType: reservation.tipo, priceCents: pricePerPerson,
        status: 'confirmed', promoterId: reservation.promoter_id, spotReservationId: reservation.id,
      }))
    }
    return { reservation, tickets }
  })

  const tiquetes = []
  for (const ticket of tickets) {
    const qr_data_url = await deliverTicketQr(
      {
        email: reservation.email, nombre: reservation.nombre, eventTitle: reservation.event_title,
        eventDate: reservation.event_date, ticketType: reservation.tipo, qrToken: ticket.qrToken,
      },
      onEmailError,
    )
    tiquetes.push({ ticket_id: ticket.id, qr_data_url })
  }
  return { reservation_id: reservation.id, status: 'confirmed' as const, tiquetes }
}

export async function cancelReservation(reservationId: string) {
  const cancelled = await db.run(
    `update spot_reservations set status = 'cancelled' where id = $1 and status = 'pending_payment'`,
    [reservationId],
  )
  if (cancelled === 0) return failNotPending(db, 'spot_reservations', reservationId)
  return { reservation_id: reservationId, status: 'cancelled' as const }
}
