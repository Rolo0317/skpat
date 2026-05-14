import { describe, it, expect } from 'vitest'
import { hashSecret, verifySecret } from '../../src/lib/argon2.js'

describe('Password storage', () => {
  it('stored password hash starts with $argon2id$', async () => {
    const h = await hashSecret('test-password-value')
    expect(h.startsWith('$argon2id$')).toBe(true)
  })

  it('@node-rs/argon2 hash for internal tokens starts with $argon2id$', async () => {
    const h = await hashSecret('test-token-value')
    expect(h.startsWith('$argon2id$')).toBe(true)
  })

  it('verifying argon2 hash with correct token returns true', async () => {
    const h = await hashSecret('correct')
    await expect(verifySecret(h, 'correct')).resolves.toBe(true)
  })

  it('verifying argon2 hash with wrong token returns false', async () => {
    const h = await hashSecret('correct')
    await expect(verifySecret(h, 'wrong')).resolves.toBe(false)
  })

  it('verifying with garbage hash returns false (no throw)', async () => {
    await expect(verifySecret('not-a-valid-hash', 'whatever')).resolves.toBe(false)
  })
})
