import { db, type SqlClient } from '../lib/db.js'

export interface PromoterRow {
  id: string
  nombre: string
  whatsapp: string
  activo: boolean
}

export interface WhatsappContext {
  eventId?: string | null
  guestListId?: string | null
  promoterId?: string | null
  eventTitle?: string | null
  tipo?: string | null
  nombre?: string | null
  referencia?: string | null
}

export function buildWhatsappUrl(whatsapp: string, message: string): string {
  return `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}

export async function resolvePromoter(context: WhatsappContext, executor: SqlClient = db): Promise<PromoterRow | null> {
  if (context.guestListId) {
    const row = await executor.one<PromoterRow>(
      `select p.id, p.nombre, p.whatsapp, p.activo
         from guest_lists l join promoters p on p.id = l.promoter_id
        where l.id = $1 and p.activo`,
      [context.guestListId],
    )
    if (row) return row
  }
  if (context.promoterId) {
    const row = await executor.one<PromoterRow>(
      'select id, nombre, whatsapp, activo from promoters where id = $1 and activo',
      [context.promoterId],
    )
    if (row) return row
  }
  if (context.eventId) {
    const row = await executor.one<PromoterRow>(
      `select p.id, p.nombre, p.whatsapp, p.activo
         from events e join promoters p on p.id = e.promoter_id
        where e.id = $1 and p.activo`,
      [context.eventId],
    )
    if (row) return row
  }
  const firstActive = await executor.one<PromoterRow>(
    'select id, nombre, whatsapp, activo from promoters where activo order by created_at asc limit 1',
  )
  return firstActive ?? null
}

export async function eventWhatsappUrl(context: WhatsappContext, executor: SqlClient = db): Promise<string | null> {
  const promoter = await resolvePromoter(context, executor)
  if (!promoter) return null
  const lines = [
    'Hola Skpat VIP, quiero continuar con mi solicitud.',
    context.eventTitle ? `Evento: ${context.eventTitle}` : null,
    context.tipo ? `Tipo: ${context.tipo}` : null,
    context.nombre ? `Nombre: ${context.nombre}` : null,
    context.referencia ? `Referencia: ${context.referencia}` : null,
  ].filter(Boolean)
  return buildWhatsappUrl(promoter.whatsapp, lines.join('\n'))
}
