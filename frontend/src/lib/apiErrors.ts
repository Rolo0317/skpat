import { isApiError } from './api'

const CONNECTION_ERROR = 'Error de conexión. Intenta de nuevo.'

interface ValidationIssue {
  message: string
}

function isIssueList(value: unknown): value is ValidationIssue[] {
  return Array.isArray(value) && value.every((issue) => typeof issue?.message === 'string')
}

/** Mensaje legible para un error de la API: primero el diccionario propio, luego validaciones, luego el código. */
export function apiErrorMessage(error: unknown, messages: Record<string, string> = {}): string {
  if (!isApiError(error)) return CONNECTION_ERROR
  if (messages[error.error]) return messages[error.error]!
  if (isIssueList(error.issues)) return error.issues.map((issue) => issue.message).join(', ')
  return error.message ?? error.error
}
