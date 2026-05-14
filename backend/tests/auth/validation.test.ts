import { describe, it, expect } from 'vitest'
import { registerSchema, loginSchema } from '../../src/lib/schemas.js'

describe('Auth input validation (zod)', () => {
  it('rejects email without @ symbol', () => {
    const r = loginSchema.safeParse({ email: 'no-at-symbol', password: 'longenough1' })
    expect(r.success).toBe(false)
  })

  it('rejects password shorter than 8 chars', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'short' })
    expect(r.success).toBe(false)
  })

  it('rejects password longer than 128 chars', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'a'.repeat(129) })
    expect(r.success).toBe(false)
  })

  it('strips unknown fields from request body', () => {
    const r = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'longenough1',
      nombre: 'Test',
      cedula: '12345678',
      telefono: '3001234567',
      role: 'admin',    // <-- should be stripped
      isAdmin: true,    // <-- should be stripped
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data).not.toHaveProperty('role')
      expect(r.data).not.toHaveProperty('isAdmin')
    }
  })

  it('returns structured error tree on validation failure', () => {
    const r = registerSchema.safeParse({})
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.length).toBeGreaterThan(0)
    }
  })

  it('normalizes email to lowercase and trimmed', () => {
    const r = loginSchema.safeParse({ email: '  TEST@EXAMPLE.COM  ', password: 'longenough1' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe('test@example.com')
  })

  it('rejects cedula with non-digits', () => {
    const r = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'longenough1',
      nombre: 'X',
      cedula: '1234A678',
      telefono: '3001234567',
    })
    expect(r.success).toBe(false)
  })
})
