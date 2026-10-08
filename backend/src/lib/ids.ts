import { z } from 'zod'
import { HttpError } from './db/types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Postgres rechaza con error un uuid mal formado; tratarlo como "no existe" mantiene el contrato 404. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export const idSchema = z.string().min(1)

/** Un id mal formado nunca existe: se responde el mismo 404 que para un id desconocido. */
export function requireUuid(value: unknown, notFoundCode: string): string {
  if (!isUuid(value)) throw new HttpError(404, notFoundCode)
  return value
}
