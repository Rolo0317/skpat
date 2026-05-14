import { describe, it } from 'vitest'

// Covers AUTH-02 — JWT issuance and verification.
// Implementation lands in plan 01-02.
describe('Session lifecycle', () => {
  it.todo('issues JWT on successful login')
  it.todo('verifies JWT via JWKS endpoint with jose')
  it.todo('rejects expired JWT')
  it.todo('rejects JWT with invalid signature')
})
