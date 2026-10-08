import { readFile } from 'node:fs/promises'
import { PGlite, types, type Transaction } from '@electric-sql/pglite'
import type { SqlClient } from './types.js'

/** Única fuente del esquema: la migración que también se aplicó en Supabase. */
const SCHEMA_FILE = new URL('../../../../supabase/migrations/0002_skpat_schema.sql', import.meta.url)

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
  await pg.exec('set search_path to skpat, public')
  return wrap(pg)
}
