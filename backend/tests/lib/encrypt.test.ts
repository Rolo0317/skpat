import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '../../src/lib/encrypt.js'

describe('AES-256-GCM encrypt/decrypt', () => {
  it('encrypts plaintext to hex of length >= (12+16+N) bytes', () => {
    const out = encrypt('hello')
    // 12 IV + 16 tag + 5 ciphertext = 33 bytes -> 66 hex chars
    expect(out).toMatch(/^[0-9a-f]+$/)
    expect(out.length).toBeGreaterThanOrEqual(66)
  })

  it('decrypts back to original plaintext', () => {
    expect(decrypt(encrypt('hola mundo'))).toBe('hola mundo')
  })

  it('round-trips unicode', () => {
    const v = 'José Andrés ÑÖ 🎉'
    expect(decrypt(encrypt(v))).toBe(v)
  })

  it('produces a different ciphertext each call (unique IV)', () => {
    expect(encrypt('same')).not.toBe(encrypt('same'))
  })

  it('throws on tampered ciphertext (auth tag mismatch)', () => {
    const ct = encrypt('secret')
    // Flip a byte in the data section (past IV+tag = 28 bytes = 56 hex chars)
    const tampered = ct.slice(0, 56) + (ct[56] === '0' ? '1' : '0') + ct.slice(57)
    expect(() => decrypt(tampered)).toThrow()
  })

  it('throws on truncated ciphertext', () => {
    expect(() => decrypt('00ff')).toThrow()
  })
})
