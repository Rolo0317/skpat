import { readFile } from 'node:fs/promises'
import { PGlite, types, type Transaction } from '@electric-sql/pglite'
import type { SqlClient } from './types.js'

/** Única fuente del esquema: las migraciones que también se aplicaron en Supabase (0003 es solo de Supabase). */
const MIGRATIONS_DIR = new URL('../../../../supabase/migrations/', import.meta.url)
const SCHEMA_FILE = new URL('0002_skpat_schema.sql', MIGRATIONS_DIR)
/** Migraciones idempotentes: se aplican en cada arranque para poner al día también las bases persistidas. */
const IDEMPOTENT_MIGRATIONS = ['0004_skpat_lista.sql'].map((file) => new URL(file, MIGRATIONS_DIR))

type Executor = PGlite | Transaction

// count(*) y sum() devuelven bigint; los exponemos como number igual que en producción.
const parsers = { [types.INT8]: (value: string) => Number(value), [types.NUMERIC]: (value: string) => Number(value) }

function wrap(executor: Executor): SqlClient {
  const query = async <T>(sql: string, params: unknown[] = []) =>
    executor.query<T>(sql, params, { parsers })

  return {
    many: async (sql, params) => (await query(sql, params)).rows as never,
    one: async (sql, params) => (await query(sql, params)).rows[0] as never,
    run: async (sql, params) => (await query(sql, params)).affectedRows ?? 0,
    transaction: async (work) => {
      if (!('transaction' in executor)) return work(wrap(executor))
      return executor.transaction((tx) => work(wrap(tx)))
    },
  }
}

/**
 * Postgres embebido (WASM) para pruebas y desarrollo local sin Docker.
 * Sin `dataDir` vive en memoria; con `dataDir` persiste en disco.
 */
export async function createPgliteClient(dataDir?: string): Promise<SqlClient> {
  const pg = new PGlite(dataDir)
  const alreadyMigrated = await pg.query<{ exists: boolean }>(
    `select exists (select 1 from information_schema.schemata where schema_name = 'skpat') as exists`,
  )
  if (!alreadyMigrated.rows[0]?.exists) {
    await pg.exec(await readFile(SCHEMA_FILE, 'utf8'))
  }
  for (const migration of IDEMPOTENT_MIGRATIONS) await pg.exec(await readFile(migration, 'utf8'))
  await pg.exec('set search_path to skpat, public')
  return wrap(pg)
}
