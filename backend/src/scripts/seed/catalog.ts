import type { SkpatRole } from '../../lib/schemas.js'

const CENTS_PER_PESO = 100
export const pesos = (amount: number) => amount * CENTS_PER_PESO

/** Sin control de inventario (columna stock_qty = -1). */
export const UNTRACKED_STOCK = -1

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
