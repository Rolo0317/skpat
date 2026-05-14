import { describe, it } from 'vitest'

// Covers AUTH-01 — user registration with local auth.
// Implementation lands in plan 01-02.
describe('POST /auth/register', () => {
  it.todo('creates a user in SQLite with hashed password for valid email+password')
  it.todo('returns 400 for invalid email format')
  it.todo('returns 400 for password shorter than 8 chars')
  it.todo('rejects duplicate email registration')
})
