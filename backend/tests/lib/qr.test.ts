import { describe, expect, it } from 'vitest'
import { generateQrToken, generateQrDataUrl } from '../../src/lib/qr.js'

describe('generateQrToken', () => {
  it('returns a 64-character string', () => {
    expect(generateQrToken()).toHaveLength(64)
  })

  it('matches lowercase hex pattern', () => {
    expect(generateQrToken()).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces unique tokens across 100 calls', () => {
    const tokens = new Set<string>()
    for (let i = 0; i < 100; i++) tokens.add(generateQrToken())
    expect(tokens.size).toBe(100)
  })
})

describe('generateQrDataUrl', () => {
  it('returns a data URL with PNG base64 prefix', async () => {
    const url = await generateQrDataUrl('a'.repeat(64))
    expect(url.startsWith('data:image/png;base64,')).toBe(true)
    expect(url.length).toBeGreaterThan(100)
  })
})
