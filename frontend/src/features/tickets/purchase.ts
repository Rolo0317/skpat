import type { Etapa, PrecioVigente } from '@/lib/operacion'

/** Respuesta de POST /tickets/purchase: la compra queda pendiente hasta cerrar el pago por WhatsApp. */
export interface PurchaseResult {
  ticket_id: string
  status: 'pending_payment'
  price_cents: number
  price_stage: string
  event_title: string
  whatsapp_url: string | null
}

export interface BuyerForm {
  nombre: string
  email: string
  cedula: string
  telefono: string
}

export const EMPTY_BUYER: BuyerForm = { nombre: '', email: '', cedula: '', telefono: '' }

const CEDULA_PATTERN = /^\d{5,15}$/
const TELEFONO_PATTERN = /^\d{7,15}$/

export const PURCHASE_ERRORS: Record<string, string> = {
  AlreadyOnList: 'Ese correo ya tiene una entrada para este evento. Revisa "Mis tiquetes" o tu correo.',
  SoldOut: 'No quedan cupos para este evento.',
  EventNotFound: 'Este evento ya no está disponible.',
}

/** Devuelve el primer error de validación del comprador, o null si todo está bien. */
export function buyerValidationError(buyer: BuyerForm): string | null {
  if (!CEDULA_PATTERN.test(buyer.cedula)) return 'La cédula debe tener solo dígitos (5 a 15).'
  if (buyer.telefono && !TELEFONO_PATTERN.test(buyer.telefono)) return 'El teléfono debe tener solo dígitos (7 a 15).'
  return null
}

export function buyerPayload(eventId: string, buyer: BuyerForm) {
  return {
    event_id: eventId,
    nombre: buyer.nombre.trim(),
    email: buyer.email.trim().toLowerCase(),
    cedula: buyer.cedula,
    telefono: buyer.telefono || undefined,
  }
}

/** Etapas que vienen después de la vigente (aún no vencidas, en su orden). */
export function upcomingStages(etapas: Etapa[], vigente: PrecioVigente, now: Date = new Date()): Etapa[] {
  if (vigente.es_taquilla) return []
  const active = [...etapas]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((etapa) => !etapa.ends_at || new Date(etapa.ends_at) > now)
  return active.slice(1)
}

/** Sin etapas vigentes y sin precio de taquilla definido no hay nada que cobrar en línea. */
export function isOnlineSaleOpen(vigente: PrecioVigente): boolean {
  return !(vigente.es_taquilla && vigente.price_cents === 0)
}
