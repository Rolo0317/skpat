import type { SkpatRole } from '../../lib/schemas.js'

const CENTS_PER_PESO = 100
const pesos = (amount: number) => amount * CENTS_PER_PESO

/** Sin control de inventario (columna stock_qty = -1). */
export const UNTRACKED_STOCK = -1

export interface DemoEvent {
  slug: string
  title: string
  description: string
  genre: string
  lineup: string[]
  price: number
  available_spots: number
  is_vip: boolean
}

export interface DemoMenuItem {
  name: string
  description: string
  category: string
  price_cents: number
  stock_qty: number
  min_stock: number
}

export interface DemoStaffUser {
  email: string
  nombre: string
  role: SkpatRole
}


/** Se asignan en orden a los próximos viernes/sábados. */
export const DEMO_EVENTS: DemoEvent[] = [
  {
    slug: 'guaracha-inferno',
    title: 'Guaracha Inferno',
    description: 'La noche más caliente de Bogotá: guaracha, aleteo y zapateo hasta el amanecer.',
    genre: 'guaracha',
    lineup: ['DJ Kalaña', 'Zapateo Brothers', 'La Mona Aleteo'],
    price: pesos(60_000),
    available_spots: 400,
    is_vip: false,
  },
  {
    slug: 'techno-subterraneo',
    title: 'Techno Subterráneo',
    description: 'Cuarto oscuro, luces estroboscópicas y techno industrial sin concesiones.',
    genre: 'techno',
    lineup: ['Nocturna', 'Bunker 2600', 'Ferro'],
    price: pesos(70_000),
    available_spots: 350,
    is_vip: false,
  },
  {
    slug: 'afro-house-ritual',
    title: 'Afro House Ritual',
    description: 'Percusión, voces ancestrales y grooves profundos para bailar descalzo el alma.',
    genre: 'afro house',
    lineup: ['Baobab Sound', 'Selva Negra', 'Kuumba'],
    price: pesos(65_000),
    available_spots: 300,
    is_vip: false,
  },
  {
    slug: 'tribal-fever',
    title: 'Tribal Fever',
    description: 'Tribal guarachero a 130 BPM con show de percusión en vivo.',
    genre: 'tribal',
    lineup: ['Tambó', 'DJ Chamán', 'Tribu 57'],
    price: pesos(55_000),
    available_spots: 400,
    is_vip: false,
  },
  {
    slug: 'skpat-vip-guaracha-vs-tribal',
    title: 'Skpat VIP: Guaracha vs Tribal',
    description: 'Noche VIP con palcos, botella de bienvenida y back to back de guaracha contra tribal.',
    genre: 'guaracha',
    lineup: ['DJ Kalaña', 'Tambó', 'Zapateo Brothers', 'DJ Chamán'],
    price: pesos(120_000),
    available_spots: 200,
    is_vip: true,
  },
]

/** Algunos ítems quedan por debajo de min_stock a propósito para que el panel muestre alertas. */
export const DEMO_MENU: DemoMenuItem[] = [
  { name: 'Aguardiente Antioqueño 750 ml', description: 'Botella tradicional, sin azúcar', category: 'licores', price_cents: pesos(180_000), stock_qty: 24, min_stock: 6 },
  { name: 'Aguardiente Antioqueño 375 ml', description: 'Media botella', category: 'licores', price_cents: pesos(100_000), stock_qty: 4, min_stock: 6 },
  { name: 'Tequila José Cuervo Especial 750 ml', description: 'Botella con limón y sal', category: 'licores', price_cents: pesos(260_000), stock_qty: 10, min_stock: 3 },
  { name: 'Ron Medellín Añejo 3 años 750 ml', description: 'Botella', category: 'rones', price_cents: pesos(170_000), stock_qty: 18, min_stock: 5 },
  { name: 'Ron Viejo de Caldas 750 ml', description: 'Botella', category: 'rones', price_cents: pesos(165_000), stock_qty: 2, min_stock: 5 },
  { name: 'Whisky Old Parr 12 años 750 ml', description: 'Botella con mezcladores', category: 'whiskies', price_cents: pesos(420_000), stock_qty: 8, min_stock: 3 },
  { name: 'Whisky Buchanan’s 12 años 750 ml', description: 'Botella con mezcladores', category: 'whiskies', price_cents: pesos(450_000), stock_qty: 1, min_stock: 3 },
  { name: 'Mojito', description: 'Ron blanco, hierbabuena, limón', category: 'cocteles', price_cents: pesos(32_000), stock_qty: UNTRACKED_STOCK, min_stock: 0 },
  { name: 'Margarita', description: 'Tequila, triple sec, limón', category: 'cocteles', price_cents: pesos(35_000), stock_qty: UNTRACKED_STOCK, min_stock: 0 },
  { name: 'Gin Tonic', description: 'Ginebra, tónica y pepino', category: 'cocteles', price_cents: pesos(38_000), stock_qty: UNTRACKED_STOCK, min_stock: 0 },
  { name: 'Cerveza Club Colombia', description: 'Botella 330 ml', category: 'cervezas', price_cents: pesos(12_000), stock_qty: 180, min_stock: 48 },
  { name: 'Cerveza Águila', description: 'Botella 330 ml', category: 'cervezas', price_cents: pesos(10_000), stock_qty: 30, min_stock: 48 },
  { name: 'Corona', description: 'Botella 355 ml con limón', category: 'cervezas', price_cents: pesos(16_000), stock_qty: 96, min_stock: 24 },
  { name: 'Agua sin gas', description: 'Botella 600 ml', category: 'hidratacion', price_cents: pesos(7_000), stock_qty: 120, min_stock: 30 },
  { name: 'Red Bull', description: 'Lata 250 ml', category: 'hidratacion', price_cents: pesos(15_000), stock_qty: 12, min_stock: 24 },
  { name: 'Coca-Cola', description: 'Botella 400 ml', category: 'mezcladores', price_cents: pesos(8_000), stock_qty: 90, min_stock: 24 },
  { name: 'Picada Skpat', description: 'Chorizo, chicharrón, papa criolla y arepa', category: 'comida', price_cents: pesos(55_000), stock_qty: UNTRACKED_STOCK, min_stock: 0 },
  { name: 'Salchipapa VIP', description: 'Para compartir', category: 'comida', price_cents: pesos(35_000), stock_qty: UNTRACKED_STOCK, min_stock: 0 },
]

/** Dos meseros para que el dashboard muestre un desglose comparativo por mesero. */
export const DEMO_STAFF: DemoStaffUser[] = [
  { email: 'admin@skpat.vip', nombre: 'Admin Skpat', role: 'admin' },
  { email: 'mesero@skpat.vip', nombre: 'Camilo Mesero', role: 'mesero' },
  { email: 'mesero2@skpat.vip', nombre: 'Valentina Mesera', role: 'mesero' },
  { email: 'portero@skpat.vip', nombre: 'Andrés Portero', role: 'portero' },
  { email: 'cliente@skpat.vip', nombre: 'Laura Cliente', role: 'cliente' },
]
