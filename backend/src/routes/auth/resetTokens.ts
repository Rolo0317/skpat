import { createHash, randomBytes } from 'node:crypto'

const RESET_TOKEN_BYTES = 32
const MS_PER_HOUR = 60 * 60 * 1000
export const RESET_TOKEN_TTL_MS = MS_PER_HOUR

/** Token de un solo uso con 256 bits de entropía (64 caracteres hex). */
export function generateResetToken(): string {
  return randomBytes(RESET_TOKEN_BYTES).toString('hex')
}

/** SHA-256 basta (no argon2): el token es aleatorio y de alta entropía, y se busca por igualdad. */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
