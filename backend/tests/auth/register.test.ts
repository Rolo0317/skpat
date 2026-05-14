import { describe, it } from 'vitest'

// Covers AUTH-01 — registration via Supabase Auth.
// Implementation lands in plan 01-02.
describe('POST /auth/register', () => {
  it.todo('creates a user via supabase.auth.signUp with valid email+password')
  it.todo('returns 400 for invalid email format')
  it.todo('returns 400 for password shorter than 8 chars')
  it.todo('rejects duplicate email registration')
})
