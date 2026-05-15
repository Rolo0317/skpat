/**
 * Palco tier pricing in cents (Colombian pesos).
 * These are the ADDITIONAL charges on top of base event price.
 * General tickets use the event's base price.
 */
export const PALCO_PRICES_CENTS: Record<string, number> = {
  palco_silver: 20000_00,   // $200.000 COP
  palco_gold: 40000_00,     // $400.000 COP
  palco_platinum: 80000_00, // $800.000 COP
}

export type TicketType = 'general' | 'palco_silver' | 'palco_gold' | 'palco_platinum'

export const TICKET_TYPES: TicketType[] = ['general', 'palco_silver', 'palco_gold', 'palco_platinum']
