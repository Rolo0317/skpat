/** Códigos SQLSTATE de Postgres que las rutas traducen a respuestas de dominio. */
const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'

const hasCode = (err: unknown, code: string) =>
  typeof err === 'object' && err !== null && (err as { code?: string }).code === code

export const isUniqueViolation = (err: unknown) => hasCode(err, UNIQUE_VIOLATION)
export const isForeignKeyViolation = (err: unknown) => hasCode(err, FOREIGN_KEY_VIOLATION)

/** Nombre de la restricción violada: PGlite lo expone como `constraint`, postgres.js como `constraint_name`. */
export function violatedConstraint(err: unknown): string {
  const details = err as { constraint?: string; constraint_name?: string }
  return details.constraint ?? details.constraint_name ?? ''
}
