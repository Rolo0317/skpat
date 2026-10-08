import type { SqlClient } from '../../lib/db.js'
import { GUEST_LIST_NAME, REAL_PROMOTERS, VENUE_REFERENCIA } from './activeEvent.js'
import type { SeededEvent } from './seedEvents.js'

export type PromoterKey = keyof typeof REAL_PROMOTERS

/** Idempotente por número de WhatsApp; se insertan en orden para que el primero sea el gestor por defecto. */
export async function seedPromoters(executor: SqlClient): Promise<{ ids: Record<PromoterKey, string>; created: number }> {
  const ids = {} as Record<PromoterKey, string>
  let created = 0
  for (const [key, promoter] of Object.entries(REAL_PROMOTERS) as [PromoterKey, (typeof REAL_PROMOTERS)[PromoterKey]][]) {
    const inserted = await executor.one<{ id: string }>(
      `insert into promoters (nombre, whatsapp)
       select $1, $2 where not exists (select 1 from promoters where whatsapp = $2)
       returning id`,
      [promoter.nombre, promoter.whatsapp],
    )
    if (inserted) created++
    const row = inserted ?? (await executor.one<{ id: string }>('select id from promoters where whatsapp = $1', [promoter.whatsapp]))
    ids[key] = row!.id
  }
  return { ids, created }
}

/** Solo completa la referencia si está vacía: la dirección exacta la define el admin. */
export async function seedVenueSettings(executor: SqlClient): Promise<void> {
  await executor.run(
    `insert into venue_settings (id, referencia) values (true, $1)
     on conflict (id) do update set referencia = coalesce(venue_settings.referencia, excluded.referencia)`,
    [VENUE_REFERENCIA],
  )
}

/** Una "Lista general" por noche con slug fijo (idempotente por slug). */
export async function seedGuestLists(executor: SqlClient, events: SeededEvent[], promoterId: string): Promise<number> {
  let created = 0
  for (const event of events) {
    created += await executor.run(
      `insert into guest_lists (event_id, nombre, slug, promoter_id) values ($1, $2, $3, $4)
       on conflict (slug) do nothing`,
      [event.id, GUEST_LIST_NAME, event.night.listSlug, promoterId],
    )
  }
  return created
}
