import { describe, it } from 'vitest'

// Covers AUTH-08 — input validation backend.
// Implementation lands in plan 01-02.
describe('Auth input validation (zod)', () => {
  it.todo('rejects email without @ symbol')
  it.todo('rejects password shorter than 8 chars')
  it.todo('rejects password longer than 128 chars')
  it.todo('strips unknown fields from request body')
  it.todo('returns 400 with structured zod error tree on validation failure')
})
