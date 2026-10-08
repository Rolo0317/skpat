import type { SqlClient } from './db/types.js'

/**
 * INSERT/UPDATE genéricos a partir de un objeto validado por zod. Las claves son una lista blanca
 * de columnas (vienen del esquema), por eso es seguro interpolarlas; los valores siempre van como
 * parámetros. `table` y `projection` son constantes del código, nunca datos de usuario.
 */
export type ColumnValues = Record<string, unknown>

function toColumnValues(fields: ColumnValues) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined)
  return { columns: entries.map(([column]) => column), values: entries.map(([, value]) => value) }
}

const placeholder = (index: number) => `$${index + 1}`

export async function insertRow<T>(executor: SqlClient, table: string, fields: ColumnValues, projection: string): Promise<T> {
  const { columns, values } = toColumnValues(fields)
  const row = await executor.one<T>(
    `insert into ${table} (${columns.join(', ')}) values (${columns.map((_, i) => placeholder(i)).join(', ')})
     returning ${projection}`,
    values,
  )
  return row!
}

/** Devuelve undefined si la fila no existe. Requiere al menos un campo. */
export function updateRow<T>(
  executor: SqlClient, table: string, id: string, fields: ColumnValues, projection: string,
): Promise<T | undefined> {
  const { columns, values } = toColumnValues(fields)
  const assignments = columns.map((column, i) => `${column} = ${placeholder(i)}`).join(', ')
  return executor.one<T>(
    `update ${table} set ${assignments} where id = ${placeholder(columns.length)} returning ${projection}`,
    [...values, id],
  )
}

export const hasFields = (fields: ColumnValues) => Object.values(fields).some((value) => value !== undefined)
