import { describe, it, expect, beforeEach } from 'vitest'
import { createHash, randomBytes } from 'node:crypto'
import { buildServer } from '../../src/app.js'
import { db } from '../../src/lib/db.js'
import { createUserWithPassword, resetDb } from '../helpers.js'

const ONE_HOUR_MS = 3_600_000
const ONE_SECOND_MS = 1000

const createTestUser = (email = 'user@skpat.com', password = 'password123') =>
  createUserWithPassword(email, password)

/** Simula lo que hace /auth/recover: guarda el hash sha256 del token crudo. */
async function insertResetToken(userId: string, { expiresAt, used }: { expiresAt: Date; used: boolean }) {
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  await db.run(
    'insert into reset_tokens (user_id, token_hash, expires_at, used) values ($1, $2, $3, $4)',
    [userId, tokenHash, expiresAt, used],
  )
  return { rawToken, tokenHash }
}

const inOneHour = () => new Date(Date.now() + ONE_HOUR_MS)

describe('POST /auth/recover', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('returns 200 with standard message for a registered email', async () => {
    const app = await buildServer()
    await createTestUser('user@skpat.com')

    const res = await app.inject({
      method: 'POST',
      url: '/auth/recover',
      payload: { email: 'user@skpat.com' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'If that email exists, a recovery link was sent' })
    await app.close()
  })

  it('returns 200 with same message for an unknown email (no enumeration)', async () => {
    const app = await buildServer()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/recover',
      payload: { email: 'doesnotexist@skpat.com' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'If that email exists, a recovery link was sent' })
    await app.close()
  })

  it('stores a hashed reset token in DB when email exists', async () => {
    const app = await buildServer()
    const user = await createTestUser('user@skpat.com')

    await app.inject({
      method: 'POST',
      url: '/auth/recover',
      payload: { email: 'user@skpat.com' },
    })

    const tokenRow = await db.one<{ token_hash: string; used: boolean; expires_at: Date }>(
      'select token_hash, used, expires_at from reset_tokens where user_id = $1',
      [user.id],
    )

    expect(tokenRow).toBeDefined()
    expect(tokenRow!.used).toBe(false)
    expect(tokenRow!.expires_at.getTime()).toBeGreaterThan(Date.now())
    expect(tokenRow!.token_hash).toHaveLength(64) // sha256 hex digest
    await app.close()
  })

  it('does NOT store any reset token for unknown email', async () => {
    const app = await buildServer()

    await app.inject({
      method: 'POST',
      url: '/auth/recover',
      payload: { email: 'ghost@skpat.com' },
    })

    const count = (await db.one<{ n: number }>('select count(*) as n from reset_tokens'))!.n
    expect(count).toBe(0)
    await app.close()
  })
})

describe('POST /auth/reset-password', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('returns 400 for an invalid token', async () => {
    const app = await buildServer()

    const fakeToken = 'a'.repeat(64)
    const res = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: { token: fakeToken, password: 'newpassword123' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Invalid or expired token' })
    await app.close()
  })

  it('returns 400 for a used token', async () => {
    const app = await buildServer()
    const user = await createTestUser()
    const { rawToken } = await insertResetToken(user.id, { expiresAt: inOneHour(), used: true })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: { token: rawToken, password: 'newpassword123' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Invalid or expired token' })
    await app.close()
  })

  it('returns 400 for an expired token', async () => {
    const app = await buildServer()
    const user = await createTestUser()
    const expiredAt = new Date(Date.now() - ONE_SECOND_MS)
    const { rawToken } = await insertResetToken(user.id, { expiresAt: expiredAt, used: false })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: { token: rawToken, password: 'newpassword123' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Invalid or expired token' })
    await app.close()
  })

  it('returns 200 and actually updates the password in DB for a valid token', async () => {
    const app = await buildServer()
    const { id: userId } = await createTestUser('user@skpat.com', 'oldpassword')

    const { rawToken, tokenHash } = await insertResetToken(userId, { expiresAt: inOneHour(), used: false })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: { token: rawToken, password: 'mynewpassword99' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Password updated successfully' })

    // Verify the token is now marked as used
    const tokenRow = await db.one<{ used: boolean }>('select used from reset_tokens where token_hash = $1', [tokenHash])
    expect(tokenRow!.used).toBe(true)

    // Verify the new password works by logging in
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'user@skpat.com', password: 'mynewpassword99' },
    })
    expect(loginRes.statusCode).toBe(200)
    expect(loginRes.json()).toHaveProperty('access_token')

    // Verify the old password no longer works
    const oldLoginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'user@skpat.com', password: 'oldpassword' },
    })
    expect(oldLoginRes.statusCode).toBe(401)

    await app.close()
  })

  it('returns 400 for validation errors (token too short or password too short)', async () => {
    const app = await buildServer()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: { token: 'short', password: 'pw' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toHaveProperty('error', 'ValidationError')
    await app.close()
  })
})
