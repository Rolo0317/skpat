import type { SqlClient } from '../../lib/db.js'

/** Postgres admite hasta 65535 parámetros por sentencia; los lotes se mantienen muy por debajo. */
const MAX_PARAMS_PER_STATEMENT = 10_000

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

function valuesClause(rowCount: number, columnCount: number): string {
  const rowPlaceholders = (row: number) =>
    Array.from({ length: columnCount }, (_, column) => `$${row * columnCount + column + 1}`).join(', ')
  return Array.from({ length: rowCount }, (_, row) => `(${rowPlaceholders(row)})`).join(', ')
}

/**
 * Inserta muchas filas con pocas sentencias (clave contra un pooler remoto).
 * `table` y `columns` son constantes del código, nunca datos de usuario.
 */
export async function bulkInsert<T extends object>(
  executor: SqlClient,
  table: string,
  columns: readonly (keyof T & string)[],
  rows: T[],
): Promise<void> {
  const rowsPerStatement = Math.floor(MAX_PARAMS_PER_STATEMENT / columns.length)
  for (const batch of chunk(rows, rowsPerStatement)) {
    await executor.run(
      `insert into ${table} (${columns.join(', ')}) values ${valuesClause(batch.length, columns.length)}`,
      batch.flatMap((row) => columns.map((column) => row[column])),
    )
  }
}
