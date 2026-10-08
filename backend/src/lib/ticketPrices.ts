/**
 * Precio total de cada palco en centavos COP (reemplaza el precio base del evento).
 * Única fuente de verdad: la usan el backend, la landing Astro y la página de compra React.
 */
export const PALCO_PRICES_CENTS: Record<string, number> = {
  palco_silver: 450_000_00,     // $450.000 COP — hasta 6 personas, 2 botellas
  palco_gold: 850_000_00,       // $850.000 COP — hasta 10 personas, 4 botellas + servicio
  palco_platinum: 1_500_000_00, // $1.500.000 COP — hasta 15 personas, bar abierto
}

export type TicketType = 'general' | 'palco_silver' | 'palco_gold' | 'palco_platinum'

export const TICKET_TYPES: TicketType[] = ['general', 'palco_silver', 'palco_gold', 'palco_platinum']

export const PALCO_TIERS = ['silver', 'gold', 'platinum'] as const
export type PalcoTier = (typeof PALCO_TIERS)[number]

export function palcoPriceCents(tier: PalcoTier): number {
  return PALCO_PRICES_CENTS[`palco_${tier}`] ?? 0
}

/** Nombre comercial del palco, p. ej. "Palco Gold". */
export function palcoLabel(tier: PalcoTier): string {
  return `Palco ${tier.charAt(0).toUpperCase()}${tier.slice(1)}`
}
