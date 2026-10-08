/**
 * Tipos de la operación real de eventos (docs/contrato-operacion-eventos.md).
 * Montos en centavos COP y fechas ISO 8601, igual que el backend.
 */

export type EstadoPago = 'pending_payment' | 'confirmed' | 'cancelled'
export type TipoUbicacion = 'palco' | 'mesa'

export interface Gestor {
  id: string
  nombre: string
  whatsapp: string
  activo: boolean
}

export interface Etapa {
  id: string
  nombre: string
  price_cents: number
  ends_at: string | null
  sort_order: number
}

export interface PrecioVigente {
  nombre: string
  price_cents: number
  ends_at: string | null
  es_taquilla: boolean
}

export interface OfertaUbicacion {
  tipo: TipoUbicacion
  price_cents: number
  incluye: string[]
}

export interface OfertaEvento {
  etapas: Etapa[]
  precio_vigente: PrecioVigente
  ubicaciones: OfertaUbicacion[]
}

export interface VenueSettings {
  direccion: string | null
  referencia: string | null
  mapa_url: string | null
}

/** Datos de contacto opcionales que el backend puede anexar a un pago pendiente. */
interface ContactoPendiente {
  telefono?: string | null
  whatsapp_url?: string | null
}

export interface TiquetePendiente extends ContactoPendiente {
  id: string
  event_id: string
  event_title: string
  event_date: string
  nombre: string
  email: string
  ticket_type: string
  price_cents: number
  price_stage: string | null
  created_at: string
}

export interface ReservaPendiente extends ContactoPendiente {
  id: string
  event_id: string
  event_title: string
  event_date: string
  spot_id: string
  tipo: TipoUbicacion
  numero: number
  capacidad: number
  nombre: string
  email: string
  price_cents: number
  promoter_id: string | null
  created_at: string
}

export interface PagosPendientes {
  tiquetes: TiquetePendiente[]
  reservas: ReservaPendiente[]
}

export interface TiqueteEmitido {
  ticket_id: string
  qr_data_url: string
}

export interface ReservaConfirmada {
  reservation_id: string
  status: 'confirmed'
  tiquetes: TiqueteEmitido[]
}

export interface ListaInvitados {
  id: string
  event_id: string
  nombre: string
  slug: string
  promoter_id: string | null
  cupo: number | null
  cierra_at: string | null
  activa: boolean
  inscritos?: number
}

export interface Inscrito {
  nombre: string
  email: string
  cedula: string
  qr_used: boolean
  created_at: string
}

export interface InscritosLista {
  lista: ListaInvitados
  inscritos: Inscrito[]
}

export interface FotoGaleria {
  id: string
  url: string
  caption: string | null
  event_id: string | null
  event_title: string | null
  created_at: string
}

export interface Anuncio {
  id: string
  titulo: string
  cuerpo: string | null
  image_url: string | null
  cta_label: string | null
  cta_url: string | null
  event_id: string | null
  starts_at: string
  ends_at: string | null
  activo: boolean
  fijado: boolean
}

export interface ArchivoSubido {
  url: string
  pathname: string
}
