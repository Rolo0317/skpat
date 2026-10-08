import { describe, it, expect, beforeEach } from 'vitest'
import { buildServer } from '../../src/app.js'
import { db } from '../../src/lib/db.js'

// Each test gets a clean DB (in-memory via DATABASE_PATH=:memory: in setup.ts)
// BUT in-memory :memory: is opened fresh each time db.ts is imported.
// Since db is a module singleton, we need to clean tables between tests.
function cleanDb() {
  db.exec('DELETE FROM refresh_tokens')
  db.exec('DELETE FROM users')
}

describe('POST /auth/register', () => {
  beforeEach(() => {
    cleanDb()
  })

  it('creates a user in SQLite with hashed password for valid email+password', async () => {
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'new@skpat.com',
        password: 'longenough1',
        nombre: 'Juan',
        cedula: '1234567890',
        telefono: '3001234567',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.userId).toBeTruthy()
    expect(body.email).toBe('new@skpat.com')
    expect(body.access_token).toBeTruthy()
    expect(body.refresh_token).toBeTruthy()

    // Verify user exists in DB with hashed password (not plaintext)
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get('new@skpat.com') as any
    expect(user).toBeTruthy()
    expect(user.password_hash).not.toBe('longenough1')
    expect(user.password_hash.startsWith('$argon2id$')).toBe(true)
    expect(user.role).toBe('cliente')

    // Verify PII is encrypted (not plaintext)
    expect(user.cedula_enc).not.toBe('1234567890')
    expect(user.telefono_enc).not.toBe('3001234567')

    await app.close()
  })

  it('returns 400 for invalid email format', async () => {
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'bad-email',
        password: 'longenough1',
        nombre: 'X',
        cedula: '12345',
        telefono: '1234567',
      },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('ValidationError')
    await app.close()
  })

  it('returns 400 for password shorter than 8 chars', async () => {
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'a@b.com',
        password: 'short',
        nombre: 'X',
        cedula: '12345',
        telefono: '1234567',
      },
    })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('rejects duplicate email registration', async () => {
    const app = await buildServer()
    const payload = {
      email: 'dup@skpat.com',
      password: 'longenough1',
      nombre: 'X',
      cedula: '12345',
      telefono: '1234567',
    }
    const res1 = await app.inject({ method: 'POST', url: '/auth/register', payload })
    expect(res1.statusCode).toBe(201)

    const res2 = await app.inject({ method: 'POST', url: '/auth/register', payload })
    expect(res2.statusCode).toBe(409)
    expect(res2.json().error).toBe('EmailAlreadyRegistered')

    await app.close()
  })

  it('strips role field from body (anti privilege escalation)', async () => {
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'escalate@skpat.com',
        password: 'longenough1',
        nombre: 'X',
        cedula: '12345',
        telefono: '1234567',
        role: 'admin', // <-- attempted escalation
      },
    })
    expect(res.statusCode).toBe(201)

    // Verify role is 'cliente', NOT 'admin'
    const user = db.prepare('SELECT role FROM users WHERE email = ?').get('escalate@skpat.com') as any
    expect(user.role).toBe('cliente')

    await app.close()
  })
})
