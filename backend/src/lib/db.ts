import { env } from './env.js'
import type { SqlClient } from './db/types.js'

export type { SqlClient } from './db/types.js'
export { HttpError } from './db/types.js'

let clientPromise: Promise<SqlClient> | undefined

/** Elige la implementación según el entorno: Postgres real si hay DATABASE_URL, si no PGlite. */
async function createClient(): Promise<SqlClient> {
  if (env.DATABASE_URL) {
    const { createPostgresClient } = await import('./db/postgresClient.js')
    return createPostgresClient(env.DATABASE_URL)
  }
  const { createPgliteClient } = await import('./db/pgliteClient.js')
  return createPgliteClient(env.NODE_ENV === 'test' ? undefined : env.PGLITE_DIR)
}

export function getDb(): Promise<SqlClient> {
  clientPromise ??= createClient()
  return clientPromise
}

/** Fachada perezosa: las rutas importan `db` sin preocuparse por la inicialización asíncrona. */
export const db: SqlClient = {
  many: async (sql, params) => (await getDb()).many(sql, params),
  one: async (sql, params) => (await getDb()).one(sql, params),
  run: async (sql, params) => (await getDb()).run(sql, params),
  transaction: async (work) => (await getDb()).transaction(work),
}
