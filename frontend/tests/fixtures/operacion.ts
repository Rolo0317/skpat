import type { SkpatEvent } from '@/features/landing/types'
import type { Gestor, ListaInvitados, OfertaEvento, PagosPendientes } from '@/lib/operacion'

/** Datos reales del evento activo, en centavos COP como los entrega el backend. */
export const EVENT_ID = '11111111-1111-4111-8111-111111111111'

export const MARATONEADOS: SkpatEvent = {
  id: EVENT_ID,
  title: 'Maratoneados en Springfield',
  date: '2026-10-11T03:00:00.000Z',
  ends_at: '2026-10-12T11:00:00.000Z',
  description: 'Simon Correa y Santiago Cardona',
  price: 0,
  image_url: null,
  available_spots: 300,
  is_vip: 0,
  is_active: 1,
  promoter_id: null,
  lineup: ['Simon Correa', 'Santiago Cardona'],
  created_at: '2026-10-01T00:00:00.000Z',
  precio_vigente: { nombre: 'Etapa 1', price_cents: 1_000_000, ends_at: '2026-10-09T05:00:00.000Z', es_taquilla: false },
}

export const OFERTA: OfertaEvento = {
  etapas: [
    { id: 'e1', nombre: 'Etapa 1', price_cents: 1_000_000, ends_at: '2099-10-09T05:00:00.000Z', sort_order: 0 },
    { id: 'e2', nombre: 'Etapa 2', price_cents: 1_500_000, ends_at: null, sort_order: 1 },
  ],
  precio_vigente: { nombre: 'Etapa 1', price_cents: 1_000_000, ends_at: '2099-10-09T05:00:00.000Z', es_taquilla: false },
  ubicaciones: [
    { tipo: 'palco', price_cents: 120_000_000, incluye: ['10 entradas', '1 botella'] },
    { tipo: 'mesa', price_cents: 100_000_000, incluye: ['8 entradas'] },
  ],
}

export const GESTOR: Gestor = { id: 'g1', nombre: 'Laura Gestora', whatsapp: '573001112233', activo: true }

export const PENDIENTES: PagosPendientes = {
  tiquetes: [{
    id: 't1', event_id: EVENT_ID, event_title: MARATONEADOS.title, event_date: MARATONEADOS.date, nombre: 'Ana Ruiz',
    email: 'ana@example.com', ticket_type: 'general', price_cents: 1_000_000, price_stage: 'Etapa 1',
    created_at: '2026-10-08T01:00:00.000Z', telefono: '3004445566',
  }],
  reservas: [{
    id: 'r1', event_id: EVENT_ID, event_title: MARATONEADOS.title, event_date: MARATONEADOS.date, spot_id: 's1',
    tipo: 'palco', numero: 3, capacidad: 2, nombre: 'Carlos Díaz', email: 'carlos@example.com',
    price_cents: 120_000_000, promoter_id: null, created_at: '2026-10-08T00:30:00.000Z',
  }],
}

export const LISTA: ListaInvitados = {
  id: 'l1', event_id: EVENT_ID, nombre: 'Lista Simon Correa', slug: 'simon-correa', promoter_id: 'g1',
  cupo: 50, cierra_at: null, activa: true, inscritos: 2,
}
