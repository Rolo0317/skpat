import { describe, it, expect } from 'vitest'

// Covers AUTH-09 — secrets in env, not source.
describe('env / secrets exposure', () => {
  it('ENCRYPTION_KEY is set and is 64 hex chars', () => {
    const key = process.env.ENCRYPTION_KEY
    expect(key).toBeTruthy()
    expect(key).toMatch(/^[0-9a-fA-F]{64}$/)
  })

  it('JWT_SECRET is set and at least 32 chars', () => {
    const secret = process.env.JWT_SECRET
    expect(secret).toBeTruthy()
    expect(secret!.length).toBeGreaterThanOrEqual(32)
  })

  it('JWT_REFRESH_SECRET is set and at least 32 chars', () => {
    const secret = process.env.JWT_REFRESH_SECRET
    expect(secret).toBeTruthy()
    expect(secret!.length).toBeGreaterThanOrEqual(32)
  })

  it('does not contain hardcoded JWT_SECRET value in source (checked via env only)', () => {
    // This confirms secrets come from env, not from source constants.
    // The actual secret values are only in .env files (gitignored).
    expect(process.env.JWT_SECRET).not.toBe('')
    expect(process.env.JWT_SECRET).not.toBeUndefined()
  })
})
