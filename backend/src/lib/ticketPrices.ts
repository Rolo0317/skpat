/** Modelo real: entrada general, lista gratuita y QR individuales de palco/mesa al confirmar. */
export type TicketType = 'general' | 'lista' | 'palco' | 'mesa'

export const TICKET_TYPES: TicketType[] = ['general', 'lista', 'palco', 'mesa']

export const TICKET_LABELS: Record<TicketType, string> = {
  general: 'Entrada General',
  lista: 'Lista',
  palco: 'Palco VIP',
  mesa: 'Mesa VIP',
}

export function ticketLabel(type: string): string {
  return TICKET_LABELS[type as TicketType] ?? type
}

/** Precio a cobrar: la general usa el precio del evento, la lista no cuesta y cada palco tiene precio fijo. */
export function ticketPriceCents(type: TicketType, eventPriceCents: number): number {
  if (type === 'general') return eventPriceCents
  if (type === 'lista') return 0
  return eventPriceCents
}
