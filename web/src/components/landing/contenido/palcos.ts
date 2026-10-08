import { PALCO_PRICES_CENTS, type TicketType } from '@skpat/backend/src/lib/ticketPrices.ts'

export interface Palco {
  tipo: Exclude<TicketType, 'general'>
  nombre: string
  capacidad: number
  incluye: string[]
  destacado: boolean
}

/** El precio sale del backend (lo que realmente se cobra al comprar), nunca se duplica aquí. */
export function precioDePalco(palco: Palco): number {
  return PALCO_PRICES_CENTS[palco.tipo] ?? 0
}

export const PALCOS: readonly Palco[] = [
  {
    tipo: 'palco_silver',
    nombre: 'Silver',
    capacidad: 6,
    incluye: ['2 botellas incluidas'],
    destacado: false,
  },
  {
    tipo: 'palco_gold',
    nombre: 'Gold',
    capacidad: 10,
    incluye: ['4 botellas incluidas', 'Servicio a la mesa'],
    destacado: true,
  },
  {
    tipo: 'palco_platinum',
    nombre: 'Platinum',
    capacidad: 15,
    incluye: ['Barra abierta', 'Servicio dedicado'],
    destacado: false,
  },
]
