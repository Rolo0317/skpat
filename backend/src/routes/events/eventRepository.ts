import { db, type SqlClient } from '../../lib/db.js'
import { insertRow, updateRow } from '../../lib/columnWrites.js'
import type { EventColumns } from './eventSchemas.js'

/** is_vip/is_active se exponen como 0/1: es el contrato que consume el frontend (SkpatEvent). */
export const EVENT_PROJECTION = `id, title, date, description, price, image_url, available_spots,
  is_vip::int as is_vip, is_active::int as is_active, lineup, genre, ends_at, promoter_id, created_at`

export interface EventRow {
  id: string
  title: string
  date: Date
  description: string | null
  price: number
  image_url: string | null
  available_spots: number
  is_vip: 0 | 1
  is_active: 0 | 1
  lineup: string[]
  genre: string | null
  ends_at: Date | null
  promoter_id: string | null
  created_at: Date
}

export const listActiveEvents = () =>
  db.many<EventRow>(`select ${EVENT_PROJECTION} from events where is_active order by date asc`)

export const insertEvent = (fields: EventColumns, executor: SqlClient = db) =>
  insertRow<EventRow>(executor, 'events', fields, EVENT_PROJECTION)

/** Devuelve undefined si el evento no existe. Requiere al menos un campo. */
export const updateEvent = (id: string, fields: EventColumns) =>
  updateRow<EventRow>(db, 'events', id, fields, EVENT_PROJECTION)

export const deactivateEvent = (id: string) =>
  db.run('update events set is_active = false where id = $1', [id])
