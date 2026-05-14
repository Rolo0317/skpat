import { hash, verify, Algorithm } from '@node-rs/argon2'

// Password hashing using argon2id (OWASP 2024 baseline).
// Used for: user password storage in SQLite users table.
const ARGON2_OPTS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456, // 19 MiB — OWASP 2024 baseline for server-side
  timeCost: 2,
  parallelism: 1,
} as const

export async function hashSecret(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTS)
}

export async function verifySecret(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain)
  } catch {
    return false
  }
}
