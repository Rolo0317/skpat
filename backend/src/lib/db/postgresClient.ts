import postgres from 'postgres'
import type { SqlClient } from './types.js'

type Executor = postgres.Sql | postgres.TransactionSql

function wrap(executor: Executor): SqlClient {
  const query = <T>(sql: string, params: unknown[] = []) =>
    executor.unsafe(sql, params as postgres.ParameterOrJSON<never>[]) as unknown as Promise<T[]>

  return {
    many: (sql, params) => query(sql, params),
    one: async <T>(sql: string, params?: unknown[]) => (await query<T>(sql, params))[0],
    run: async (sql, params) => {
      const result = (await query(sql, params)) as unknown as { count: number }
      return result.count
    },
    transaction: async (work) => {
      if (!('begin' in executor)) return work(wrap(executor)) // ya estamos dentro de una transacción
      return executor.begin((tx) => work(wrap(tx))) as Promise<Awaited<ReturnType<typeof work>>>
    },
  }
}

/**
 * Cliente para Postgres (Supabase vía Supavisor en modo transacción).
 * `prepare: false` es obligatorio con el pooler en modo transacción.
 */
export function createPostgresClient(databaseUrl: string): SqlClient {
  const sql = postgres(databaseUrl, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    // count(*)/sum() llegan como int8/numeric; los exponemos como number (montos en centavos caben de sobra).
    types: { bigint: { to: 20, from: [20, 1700], serialize: String, parse: Number } },
    transform: { undefined: null },
  })
  return wrap(sql)
}
