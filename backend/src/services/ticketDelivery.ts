import { generateQrDataUrl } from '../lib/qr.js'
import { sendTicketEmail } from '../lib/email.js'

const EMAIL_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'America/Bogota',
}

export interface DeliverableTicket {
  email: string
  nombre: string
  eventTitle: string
  eventDate: Date
  ticketType: string
  qrToken: string
}

/**
 * Genera la imagen del QR y la envía por correo. El correo nunca tumba la operación:
 * el QR ya quedó guardado y se puede reenviar. Se espera el envío porque en serverless
 * el proceso puede congelarse apenas sale la respuesta.
 */
export async function deliverTicketQr(
  ticket: DeliverableTicket,
  onEmailError: (err: unknown) => void,
): Promise<string> {
  const qrDataUrl = await generateQrDataUrl(ticket.qrToken)
  await sendTicketEmail({
    to: ticket.email,
    nombre: ticket.nombre,
    eventTitle: ticket.eventTitle,
    eventDate: new Date(ticket.eventDate).toLocaleString('es-CO', EMAIL_DATE_FORMAT),
    ticketType: ticket.ticketType,
    qrDataUrl,
    qrToken: ticket.qrToken,
  }).catch(onEmailError)
  return qrDataUrl
}
