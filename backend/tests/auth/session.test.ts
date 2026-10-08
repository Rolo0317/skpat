import { describe, it, expect, beforeEach } from 'vitest'
import { buildServer } from '../../src/app.js'
import { db } from '../../src/lib/db.js'
import { signAccessToken } from '../../src/lib/jwt.js'

function cleanDb() {
  db.exec('DELETE FROM refresh_tokens')
  db.exec('DELETE FROM users')
}

describe('POST /auth/login (issues tokens)', () => {
  beforeEach(() => {
    cleanDb()
  })

  async function registerUser(email = 'test@skpat.com', password = 'longenough1') {
    const app = await buildServer()
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email, password, nombre: 'Test', cedula: '12345', telefono: '1234567' },
    })
    await app.close()
  }

  it('returns access_token, refresh_token, expires_in, user on valid credentials', async () => {
    await registerUser()
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'test@skpat.com', password: 'longenough1' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.access_token).toBeTruthy()
    expect(body.refresh_token).toBeTruthy()
    expect(body.expires_in).toBe(900)
    expect(body.user.email).toBe('test@skpat.com')
    expect(body.user.role).toBe('cliente')
    await app.close()
  })

  it('returns 401 on bad credentials', async () => {
    await registerUser()
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'test@skpat.com', password: 'wrongpassword' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error).toBe('InvalidCredentials')
    await app.close()
  })

  it('returns 401 for non-existent user', async () => {
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ghost@skpat.com', password: 'longenough1' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('POST /auth/refresh', () => {
  beforeEach(() => {
    cleanDb()
  })

  it('returns new tokens for valid refresh_token', async () => {
    const app = await buildServer()
    // Register and login to get a refresh token
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'refresh@skpat.com', password: 'longenough1', nombre: 'R', cedula: '12345', telefono: '1234567' },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'refresh@skpat.com', password: 'longenough1' },
    })
    const { refresh_token } = loginRes.json()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refresh_token },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.access_token).toBeTruthy()
    expect(body.refresh_token).toBeTruthy()
    expect(body.refresh_token).not.toBe(refresh_token) // New token issued (rotation)
    await app.close()
  })

  it('returns 401 for invalid refresh_token', async () => {
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refresh_token: 'completely-invalid-refresh-token-string' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })
})

describe('GET /auth/me', () => {
  beforeEach(() => {
    cleanDb()
  })

  it('returns 401 without Authorization header', async () => {
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('returns 401 with invalid token', async () => {
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer not-a-valid-jwt' },
    })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('returns user data with valid access token', async () => {
    const app = await buildServer()
    // Register to get an access token
    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'me@skpat.com', password: 'longenough1', nombre: 'Me', cedula: '12345', telefono: '1234567' },
    })
    const { access_token, userId } = regRes.json()

    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${access_token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.id).toBe(userId)
    expect(body.email).toBe('me@skpat.com')
    expect(body.role).toBe('cliente')
    await app.close()
  })
})
