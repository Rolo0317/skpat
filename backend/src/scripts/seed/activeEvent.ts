import { pesos } from './catalog.js'

/**
 * Operación real confirmada por el dueño: el evento activo actual y su equipo de gestores.
 * La web pública muestra solo este evento; los eventos demo anteriores se desactivan.
 */

export interface RealPromoter {
  nombre: string
  whatsapp: string
}

/** El orden importa: el primero es el gestor por defecto cuando nadie más aplica (regla 5). */
export const REAL_PROMOTERS = {
  instagram: { nombre: 'Skpat VIP Instagram', whatsapp: '+573195435288' },
  palcosYMesas: { nombre: 'Info palcos y mesas', whatsapp: '+573143400648' },
  eventos: { nombre: 'Info eventos', whatsapp: '+573208751529' },
} as const satisfies Record<string, RealPromoter>

export const VENUE_REFERENCIA = 'Sector Plaza de las Américas, Bogotá'

const EVENT_NAME = 'Maratoneados en Springfield'
/** Taquilla por confirmar: precio 0 hasta que el admin lo defina (aplica cuando vencen las etapas). */
const TAQUILLA_POR_CONFIRMAR = 0
/** Aforo provisional por noche; el admin lo ajusta desde el panel. */
const PROVISIONAL_CAPACITY = 500

const LINEUP = ['Simon Correa', 'Santiago Cardona', 'Sabriel', 'Sebastián Robayo']

const DESCRIPTION = [
  `${EVENT_NAME}: guaracha y electrónica sin límite de horario.`,
  'Invitados especiales: Simon Correa y Santiago Cardona.',
  'Music & special guest: Sabriel y Sebastián Robayo.',
  'Etapa 1 $10.000, Etapa 2 $15.000, taquilla por confirmar.',
  'Palco VIP $1.200.000 y Mesa VIP $1.000.000. Consumo obligatorio.',
  `${VENUE_REFERENCIA}.`,
].join(' ')

export interface RealEventNight {
  title: string
  /** 21:00 hora Bogotá. */
  date: string
  /** El QR vale hasta el mediodía siguiente (no hay límite de horario). */
  ends_at: string
  listSlug: string
}

export const ACTIVE_EVENT_NIGHTS: RealEventNight[] = [
  {
    title: `${EVENT_NAME} · Sábado`,
    date: '2026-10-10T21:00:00-05:00',
    ends_at: '2026-10-11T12:00:00-05:00',
    listSlug: 'maratoneados-sabado',
  },
  {
    title: `${EVENT_NAME} · Domingo`,
    date: '2026-10-11T21:00:00-05:00',
    ends_at: '2026-10-12T12:00:00-05:00',
    listSlug: 'maratoneados-domingo',
  },
]

/** Campos comunes a las dos noches. */
export const ACTIVE_EVENT_DETAILS = {
  description: DESCRIPTION,
  genre: 'guaracha',
  lineup: LINEUP,
  price: TAQUILLA_POR_CONFIRMAR,
  available_spots: PROVISIONAL_CAPACITY,
  is_vip: false,
  image_url: null,
}

/** Sin fecha de corte confirmada: el admin define cuándo vence la Etapa 1 desde el panel. */
export const PRICE_STAGES = [
  { nombre: 'Etapa 1', price_cents: pesos(10_000), sort_order: 1 },
  { nombre: 'Etapa 2', price_cents: pesos(15_000), sort_order: 2 },
]

export const SPOT_OFFERS = [
  {
    tipo: 'palco',
    price_cents: pesos(1_200_000),
    incluye: ['10 entradas', '1 botella', '2 Four Loko', '2 aguas', '2 Electrolit', '15 productos'],
  },
  {
    tipo: 'mesa',
    price_cents: pesos(1_000_000),
    incluye: ['8 entradas', '1 botella', '1 Electrolit', '2 aguas', '1 Four Loko', '12 productos'],
  },
] as const

export const GUEST_LIST_NAME = 'Lista general'

/** Eventos de demostración de versiones anteriores del seed: se desactivan (sus tiquetes se conservan). */
export const LEGACY_DEMO_EVENT_TITLES = [
  'Guaracha Inferno',
  'Techno Subterráneo',
  'Afro House Ritual',
  'Tribal Fever',
  'Skpat VIP: Guaracha vs Tribal',
]
