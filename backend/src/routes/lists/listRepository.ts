import { db, type SqlClient } from '../../lib/db.js'
import { decrypt } from '../../lib/encrypt.js'

export const LIST_PROJECTION = 'id, event_id, nombre, slug, promoter_id, cupo, cierra_at, activa, created_at'

/** Los cancelados no ocupan cupo. */
const INSCRITOS_COUNT = `(select count(*) from tickets t where t.guest_list_id = l.id and t.status <> 'cancelled')`

const ADMIN_LIST_SELECT = `
  select l.id, l.event_id, e.title as event_title, e.date as event_date, l.nombre, l.slug,
         l.promoter_id, p.nombre as promoter_nombre, l.cupo, l.cierra_at, l.activa, l.created_at,
         ${INSCRITOS_COUNT} as inscritos
    from guest_lists l
    join events e on e.id = l.event_id
    left join promoters p on p.id = l.promoter_id`

export interface PublicListRow {
  id: string
  nombre: string
  cupo: number | null
  cierra_at: Date | null
  activa: boolean
  promoter_id: string | null
  inscritos: number
  event_id: string
  event_title: string
  event_date: Date
  event_ends_at: Date | null
  event_active: boolean
}

export function listGuestLists(eventId: string | undefined) {
  return db.many(
    `${ADMIN_LIST_SELECT} where ($1::uuid is null or l.event_id = $1) order by e.date desc, l.created_at asc`,
    [eventId ?? null],
  )
}

export const findGuestList = (id: string) => db.one(`${ADMIN_LIST_SELECT} where l.id = $1`, [id])

/**
 * Lista por slug con su evento y conteo de inscritos. Con `lock` bloquea la fila de la lista
 * hasta el fin de la transacción: dos registros simultáneos no pueden pasarse del cupo.
 */
export function findListBySlug(executor: SqlClient, slug: string, lock = false) {
  return executor.one<PublicListRow>(
    `select l.id, l.nombre, l.cupo, l.cierra_at, l.activa, l.promoter_id, ${INSCRITOS_COUNT} as inscritos,
            e.id as event_id, e.title as event_title, e.date as event_date, e.ends_at as event_ends_at,
            e.is_active as event_active
       from guest_lists l join events e on e.id = l.event_id
      where l.slug = $1
      ${lock ? 'for update of l' : ''}`,
    [slug],
  )
}

interface InscritoRow {
  nombre: string
  email: string
  cedula_enc: string
  qr_used: boolean
  created_at: Date
}

/** Inscritos con la cédula descifrada (solo para el panel admin). */
export async function listInscritos(listId: string) {
  const rows = await db.many<InscritoRow>(
    `select nombre, email, cedula_enc, qr_used, created_at
       from tickets where guest_list_id = $1 and status <> 'cancelled'
      order by created_at asc`,
    [listId],
  )
  return rows.map(({ cedula_enc, ...row }) => ({ ...row, cedula: decrypt(cedula_enc) }))
}
