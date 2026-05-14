import { describe, it } from 'vitest'

// Covers AUTH-06 — PII (cedula, telefono) encrypted at rest.
// Implementation lands in plan 01-02.
describe('AES-256-GCM encrypt/decrypt', () => {
  it.todo('encrypts plaintext to hex of length >= 56 chars (12 IV + 16 tag + N data)')
  it.todo('decrypts back to original plaintext')
  it.todo('two encryptions of the same plaintext produce different ciphertexts (unique IV)')
  it.todo('throws on tampered ciphertext (auth tag mismatch)')
  it.todo('throws when ENCRYPTION_KEY is not 32 bytes')
})
