import { db, type SqlClient } from '../../lib/db.js'
import type { EventColumns } from './eventSchemas.js'

/** is_vip/is_active se exponen como 0/1: es el contrato que consume el frontend (SkpatEvent). */
export const EVENT_PROJECTION = `id, title, date, description, price, image_url, available_spots,
  is_vip::int as is_vip, is_active::int as is_active, lineup, genre, created_at`

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
  created_at: Date
}

/**
 * Las claves vienen de un esquema zod (lista blanca de columnas), por eso es seguro
 * interpolarlas; los valores siempre viajan como parámetros.
 */
function toColumnValues(fields: EventColumns) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined)
  return { columns: entries.map(([column]) => column), values: entries.map(([, value]) => value) }
}

const placeholder = (index: number) => `$${index + 1}`

export const listActiveEvents = () =>
  db.many<EventRow>(`select ${EVENT_PROJECTION} from events where is_active order by date asc`)

export async function insertEvent(fields: EventColumns, executor: SqlClient = db): Promise<EventRow> {
  const { columns, values } = toColumnValues(fields)
  const row = await executor.one<EventRow>(
    `insert into events (${columns.join(', ')}) values (${columns.map((_, i) => placeholder(i)).join(', ')})
     returning ${EVENT_PROJECTION}`,
    values,
  )
  return row!
}

/** Devuelve undefined si el evento no existe. Requiere al menos un campo. */
export function updateEvent(id: string, fields: EventColumns): Promise<EventRow | undefined> {
  const { columns, values } = toColumnValues(fields)
  const assignments = columns.map((column, i) => `${column} = ${placeholder(i)}`).join(', ')
  return db.one<EventRow>(
    `update events set ${assignments} where id = ${placeholder(columns.length)} returning ${EVENT_PROJECTION}`,
    [...values, id],
  )
}

export const deactivateEvent = (id: string) =>
  db.run('update events set is_active = false where id = $1', [id])
