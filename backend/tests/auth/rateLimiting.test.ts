import { describe, it } from 'vitest'

// Covers AUTH-07 — rate limiting on auth endpoints.
// Implementation lands in plan 01-02.
describe('Auth rate limiting', () => {
  it.todo('returns 429 after 5 POST /auth/login attempts in 15 minutes')
  it.todo('returns 429 after 5 POST /auth/register attempts in 15 minutes')
  it.todo('429 response includes Retry-After header')
  it.todo('rate limit resets after the time window')
})
