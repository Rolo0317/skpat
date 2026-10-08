import { z } from 'zod'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Postgres rechaza con error un uuid mal formado; tratarlo como "no existe" mantiene el contrato 404. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export const idSchema = z.string().min(1)
