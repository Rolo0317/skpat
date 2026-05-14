import { describe, it } from 'vitest'

// Covers AUTH-05 — passwords never plain text.
// Supabase Auth hashes with bcrypt (per RESEARCH.md — accepted as OWASP-compliant).
// Implementation lands in plan 01-02.
describe('Password storage', () => {
  it.todo('Supabase auth.users.encrypted_password starts with $2 (bcrypt prefix) — verified manually in DB inspector')
  it.todo('@node-rs/argon2 hash for internal tokens starts with $argon2id$')
  it.todo('verifying argon2 hash with correct token returns true')
  it.todo('verifying argon2 hash with wrong token returns false')
})
