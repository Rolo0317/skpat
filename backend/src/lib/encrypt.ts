import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { env } from './env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12   // 96-bit IV recommended for GCM
const TAG_BYTES = 16

function getKey(): Buffer {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex')
  if (key.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must decode to 32 bytes (got ${key.length})`)
  }
  return key
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('hex')
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'hex')
  if (buf.length < IV_BYTES + TAG_BYTES) {
    throw new Error('Ciphertext too short to be valid AES-256-GCM output')
  }
  const iv = buf.subarray(0, IV_BYTES)
  const authTag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const encrypted = buf.subarray(IV_BYTES + TAG_BYTES)
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
