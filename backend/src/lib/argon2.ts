import { hash, verify } from '@node-rs/argon2'

// Password hashing using argon2id (OWASP 2024 baseline).
// Used for: user password storage in SQLite users table.
// Algorithm.Argon2id = 2 (cannot use const enum with isolatedModules)
const ARGON2_OPTS = {
  algorithm: 2 as 2, // Argon2id
  memoryCost: 19456,  // 19 MiB — OWASP 2024 baseline for server-side
  timeCost: 2,
  parallelism: 1,
}

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
