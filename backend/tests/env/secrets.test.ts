import { describe, it } from 'vitest'

// Covers AUTH-09 — secrets in env, not source.
// Implementation lands in plan 01-01.
describe('env / secrets exposure', () => {
  it.todo('refuses to start if ENCRYPTION_KEY is missing')
  it.todo('refuses to start if SUPABASE_SERVICE_ROLE_KEY is missing')
  it.todo('does not log SUPABASE_SERVICE_ROLE_KEY value on boot')
})
