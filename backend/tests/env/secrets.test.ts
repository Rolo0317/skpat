import { describe, it } from 'vitest'

// Covers AUTH-09 — secrets in env, not source.
// Implementation lands in plan 01-01.
describe('env / secrets exposure', () => {
  it.todo('refuses to start if ENCRYPTION_KEY is missing')
  it.todo('refuses to start if JWT_SECRET is missing')
  it.todo('does not log JWT_SECRET value on boot')
})
