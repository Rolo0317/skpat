import type { SqlClient } from '../lib/db.js'

export async function findActiveTableId(client: SqlClient, tableNumber: number): Promise<string | undefined> {
  const table = await client.one<{ id: string }>('select id from tables where number = $1 and is_active', [tableNumber])
  return table?.id
}
