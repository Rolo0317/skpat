/**
 * Puerto de acceso a datos. Las rutas dependen de esta abstracción, nunca de un driver concreto,
 * para que producción (Supabase/Postgres) y pruebas (PGlite en memoria) compartan el mismo SQL.
 * Los parámetros son posicionales: $1, $2, ...
 */
export interface SqlClient {
  /** Todas las filas del resultado. */
  many<T>(sql: string, params?: unknown[]): Promise<T[]>
  /** La primera fila, o undefined si no hay resultados. */
  one<T>(sql: string, params?: unknown[]): Promise<T | undefined>
  /** Ejecuta sin devolver filas; retorna cuántas filas fueron afectadas. */
  run(sql: string, params?: unknown[]): Promise<number>
  /** Ejecuta `work` en una transacción; cualquier error hace rollback. */
  transaction<T>(work: (tx: SqlClient) => Promise<T>): Promise<T>
}

/** Error de dominio con código HTTP, útil para abortar transacciones con una respuesta clara. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(code)
  }
}
