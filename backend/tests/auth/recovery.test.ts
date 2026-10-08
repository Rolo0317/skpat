import { describe, it, expect, beforeEach } from 'vitest'
import { createHash, randomBytes } from 'node:crypto'
import { buildServer } from '../../src/app.js'
import { db } from '../../src/lib/db.js'
import { hashSecret } from '../../src/lib/argon2.js'

function cleanDb() {
  db.exec('DELETE FROM reset_tokens')
  db.exec('DELETE FROM refresh_tokens')
  db.exec('DELETE FROM users')
}

async function createTestUser(email = 'user@skpat.com', password = 'password123') {
  const passwordHash = await hashSecret(password)
  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, nombre)
    VALUES ('test-user-id', ?, ?, 'cliente', 'Test User')
  `).run(email, passwordHash)
  return { id: 'test-user-id', email, password }
}

describe('POST /auth/recover', () => {
  beforeEach(() => {
    cleanDb()
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
    await createTestUser('user@skpat.com')

    await app.inject({
      method: 'POST',
      url: '/auth/recover',
      payload: { email: 'user@skpat.com' },
    })

    const tokenRow = db
      .prepare("SELECT * FROM reset_tokens WHERE user_id = 'test-user-id'")
      .get() as { token_hash: string; used: number; expires_at: number } | undefined

    expect(tokenRow).toBeDefined()
    expect(tokenRow!.used).toBe(0)
    expect(tokenRow!.expires_at).toBeGreaterThan(Date.now())
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

    const count = (db.prepare('SELECT COUNT(*) as n FROM reset_tokens').get() as { n: number }).n
    expect(count).toBe(0)
    await app.close()
  })
})

describe('POST /auth/reset-password', () => {
  beforeEach(() => {
    cleanDb()
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
    await createTestUser()

    // Insert a used token directly
    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = Date.now() + 3_600_000
    db.prepare(`
      INSERT INTO reset_tokens (user_id, token_hash, expires_at, used)
      VALUES ('test-user-id', ?, ?, 1)
    `).run(tokenHash, expiresAt)

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
    await createTestUser()

    // Insert an expired token
    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const expiredAt = Date.now() - 1000 // 1 second ago
    db.prepare(`
      INSERT INTO reset_tokens (user_id, token_hash, expires_at, used)
      VALUES ('test-user-id', ?, ?, 0)
    `).run(tokenHash, expiredAt)

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

    // Insert a valid reset token directly (simulating /auth/recover)
    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = Date.now() + 3_600_000
    db.prepare(`
      INSERT INTO reset_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).run(userId, tokenHash, expiresAt)

    const res = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: { token: rawToken, password: 'mynewpassword99' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Password updated successfully' })

    // Verify the token is now marked as used
    const tokenRow = db
      .prepare('SELECT used FROM reset_tokens WHERE token_hash = ?')
      .get(tokenHash) as { used: number }
    expect(tokenRow.used).toBe(1)

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
