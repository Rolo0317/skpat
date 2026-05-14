import { describe, it } from 'vitest'

// Covers AUTH-05 — passwords never plain text.
// argon2id via @node-rs/argon2 (per RESEARCH.md).
// Implementation lands in plan 01-02.
describe('Password storage', () => {
  it.todo('stored password hash in SQLite starts with $argon2id$')
  it.todo('@node-rs/argon2 hash for internal tokens starts with $argon2id$')
  it.todo('verifying argon2 hash with correct token returns true')
  it.todo('verifying argon2 hash with wrong token returns false')
})
