import { describe, it, expect, beforeEach } from 'vitest'
import { buildServer } from '../../src/server.js'
import { db } from '../../src/lib/db.js'

function cleanDb() {
  db.exec('DELETE FROM refresh_tokens')
  db.exec('DELETE FROM users')
}

describe('Auth rate limiting', () => {
  beforeEach(() => {
    cleanDb()
  })

  it('returns 429 after 5 POST /auth/login attempts in 15 minutes from same IP', async () => {
    const app = await buildServer()
    const payload = { email: 'a@b.com', password: 'longenough1' }
    const codes: number[] = []
    for (let i = 0; i < 7; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload,
        remoteAddress: '10.0.0.99',
      })
      codes.push(res.statusCode)
    }
    // First 5: 401 (bad creds — user doesn't exist). 6th onwards: 429.
    expect(codes.slice(0, 5).every((c) => c === 401)).toBe(true)
    expect(codes[5]).toBe(429)
    expect(codes[6]).toBe(429)
    await app.close()
  })

  it('429 includes Retry-After header', async () => {
    const app = await buildServer()
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'x@y.com', password: 'longenough1' },
        remoteAddress: '10.0.0.100',
      })
    }
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'x@y.com', password: 'longenough1' },
      remoteAddress: '10.0.0.100',
    })
    expect(res.statusCode).toBe(429)
    expect(res.headers['retry-after']).toBeDefined()
    await app.close()
  })
})
