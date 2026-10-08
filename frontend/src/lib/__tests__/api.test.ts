import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, onSessionExpired } from '@/lib/api'
import { getAccessToken, getRefreshToken, saveTokens } from '@/lib/session'
import { callsTo, jsonResponse, sentBody, stubFetchRoutes } from '../../../tests/utils'

const EXPIRED = jsonResponse({ error: 'InvalidToken' }, 401)

function bearerOf(init: RequestInit): string | undefined {
  return (init.headers as Record<string, string>).Authorization
}

describe('api client', () => {
  beforeEach(() => saveTokens({ access_token: 'old-access', refresh_token: 'old-refresh' }))
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('renueva el token una vez ante un 401 y reintenta la petición', async () => {
    const fetchMock = stubFetchRoutes({
      'GET /sales/mine': (init) =>
        bearerOf(init) === 'Bearer new-access' ? jsonResponse({ sales: [] }) : EXPIRED.clone(),
      'POST /auth/refresh': () => jsonResponse({ access_token: 'new-access', refresh_token: 'new-refresh' }),
    })

    await expect(api.get('/sales/mine')).resolves.toEqual({ sales: [] })
    expect(sentBody(fetchMock, 'POST', '/auth/refresh')).toEqual({ refresh_token: 'old-refresh' })
    expect(getAccessToken()).toBe('new-access')
    expect(getRefreshToken()).toBe('new-refresh')
  })

  it('comparte un único refresh entre peticiones concurrentes', async () => {
    const fetchMock = stubFetchRoutes({
      'GET /a': (init) => (bearerOf(init) === 'Bearer new-access' ? jsonResponse('a') : EXPIRED.clone()),
      'GET /b': (init) => (bearerOf(init) === 'Bearer new-access' ? jsonResponse('b') : EXPIRED.clone()),
      'POST /auth/refresh': () => jsonResponse({ access_token: 'new-access', refresh_token: 'new-refresh' }),
    })

    await expect(Promise.all([api.get('/a'), api.get('/b')])).resolves.toEqual(['a', 'b'])
    expect(callsTo(fetchMock, '/auth/refresh')).toHaveLength(1)
  })

  it('cierra la sesión y avisa cuando el refresh es rechazado', async () => {
    stubFetchRoutes({
      'GET /auth/me': () => EXPIRED.clone(),
      'POST /auth/refresh': () => jsonResponse({ error: 'InvalidRefreshToken' }, 401),
    })
    const listener = vi.fn()
    const unsubscribe = onSessionExpired(listener)

    await expect(api.get('/auth/me')).rejects.toMatchObject({ status: 401 })
    expect(listener).toHaveBeenCalledOnce()
    expect(getAccessToken()).toBeNull()
    unsubscribe()
  })

  it('no intenta refresh cuando el login responde 401', async () => {
    const fetchMock = stubFetchRoutes({
      'POST /auth/login': () => jsonResponse({ error: 'InvalidCredentials' }, 401),
    })

    await expect(api.post('/auth/login', { email: 'a@b.co', password: 'x' })).rejects.toMatchObject({
      error: 'InvalidCredentials',
    })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('solo declara Content-Type JSON cuando hay cuerpo', async () => {
    const fetchMock = stubFetchRoutes({ 'DELETE /events/1': () => new Response(null, { status: 204 }) })

    await api.del('/events/1')
    const [, init] = fetchMock.mock.calls[0]
    expect(init?.headers).not.toHaveProperty('Content-Type')
  })
})
