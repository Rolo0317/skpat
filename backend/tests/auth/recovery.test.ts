import { describe, it } from 'vitest'

// Covers AUTH-03 — password recovery (smoke).
// Email delivery is verified manually per VALIDATION.md.
// Implementation lands in plan 01-03.
describe('POST /auth/recover', () => {
  it.todo('accepts a valid email and triggers supabase.auth.resetPasswordForEmail')
  it.todo('returns 200 even for non-existent email (prevents enumeration)')
  it.todo('rate-limits more than 3 attempts in 15 minutes')
})
