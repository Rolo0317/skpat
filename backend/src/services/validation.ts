import type { z } from 'zod'
import { HttpError } from '../lib/db.js'

/** Valida la entrada de una petición; si falla lanza el 400 uniforme `ValidationError` con los detalles. */
export function parseOrThrow<Schema extends z.ZodType>(schema: Schema, input: unknown): z.infer<Schema> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) throw new HttpError(400, 'ValidationError', { issues: parsed.error.issues })
  return parsed.data
}
