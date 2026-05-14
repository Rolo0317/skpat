import { describe, it, expect, beforeEach } from 'vitest'
import { buildServer } from '../../src/server.js'
import { db } from '../../src/lib/db.js'

function cleanDb() {
  db.exec('DELETE FROM refresh_tokens')
  db.exec('DELETE FROM users')
}

describe('POST /auth/recover', () => {
  beforeEach(() => {
    cleanDb()
  })

  it('returns 200 for valid email', async () => {
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/recover',
      payload: { email: 'user@skpat.com' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    await app.close()
  })

  it('returns 200 even for malformed email (no enumeration)', async () => {
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/recover',
      payload: { email: 'not-an-email' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    await app.close()
  })

  it('returns 200 even for non-existent email (no enumeration)', async () => {
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/recover',
      payload: { email: 'doesnotexist@skpat.com' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    await app.close()
  })
})
