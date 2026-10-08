import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { z } from 'zod'
import { db, HttpError } from './db.js'
import { hasFields, insertRow, updateRow, type ColumnValues } from './columnWrites.js'
import { requireUuid } from './ids.js'
import { isForeignKeyViolation, isUniqueViolation, violatedConstraint } from './pgErrors.js'
import { parseOrThrow } from './schemas.js'
import { adminOnly } from '../plugins/auth.js'

/** Columna con llave foránea → error 404 que entiende el panel. */
const FOREIGN_KEY_ERRORS: Record<string, string> = {
  event_id: 'EventNotFound',
  promoter_id: 'PromoterNotFound',
}

export interface AdminCrudResource<TCreate extends z.ZodType, TUpdate extends z.ZodType> {
  table: string
  /** Columnas que devuelven POST y PATCH. */
  projection: string
  notFoundCode: string
  /** Código del 409 cuando se viola una restricción única. */
  conflictCode?: string
  createSchema: TCreate
  updateSchema: TUpdate
  list: (req: FastifyRequest) => Promise<unknown[]>
  /** Completa los valores antes de insertar (p. ej. generar el slug). */
  toCreateColumns?: (input: z.infer<TCreate>) => Promise<ColumnValues>
}

function translateWriteError(err: unknown, conflictCode = 'AlreadyExists'): never {
  if (isUniqueViolation(err)) throw new HttpError(409, conflictCode)
  if (isForeignKeyViolation(err)) {
    const constraint = violatedConstraint(err)
    const column = Object.keys(FOREIGN_KEY_ERRORS).find((name) => constraint.includes(name))
    throw new HttpError(404, column ? FOREIGN_KEY_ERRORS[column]! : 'RelatedNotFound')
  }
  throw err
}

/**
 * Registra GET /, POST /, PATCH /:id y DELETE /:id de un recurso del panel (solo admin).
 * Las columnas que se escriben salen siempre del esquema zod (lista blanca).
 */
export function registerAdminCrud<TCreate extends z.ZodType, TUpdate extends z.ZodType>(
  app: FastifyInstance,
  resource: AdminCrudResource<TCreate, TUpdate>,
): void {
  const { table, projection, notFoundCode, conflictCode } = resource

  app.get('/', adminOnly, (req) => resource.list(req))

  app.post('/', adminOnly, async (req, reply) => {
    const input = parseOrThrow(resource.createSchema, req.body)
    const columns = resource.toCreateColumns ? await resource.toCreateColumns(input) : (input as ColumnValues)
    const row = await insertRow(db, table, columns, projection).catch((err) => translateWriteError(err, conflictCode))
    return reply.code(201).send(row)
  })

  app.patch<{ Params: { id: string } }>('/:id', adminOnly, async (req) => {
    const id = requireUuid(req.params.id, notFoundCode)
    const fields = parseOrThrow(resource.updateSchema, req.body) as ColumnValues
    if (!hasFields(fields)) throw new HttpError(400, 'NoFieldsToUpdate')
    const row = await updateRow(db, table, id, fields, projection).catch((err) => translateWriteError(err, conflictCode))
    if (!row) throw new HttpError(404, notFoundCode)
    return row
  })

  app.delete<{ Params: { id: string } }>('/:id', adminOnly, async (req) => {
    const id = requireUuid(req.params.id, notFoundCode)
    const deleted = await db.run(`delete from ${table} where id = $1`, [id])
    if (deleted === 0) throw new HttpError(404, notFoundCode)
    return { ok: true }
  })
}
