import { clearTokens, getAccessToken, getRefreshToken, saveTokens, type SessionTokens } from './session'

// Mismo origen por defecto: Astro sirve la API en /api. VITE_API_URL permite apuntar a otro backend.
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api'

const HTTP_UNAUTHORIZED = 401
const REFRESH_PATH = '/auth/refresh'
/** Rutas cuyo 401 significa "credenciales malas", no "token vencido": nunca disparan refresh. */
const PATHS_WITHOUT_REFRESH = new Set(['/auth/login', REFRESH_PATH])
const ABSOLUTE_URL = /^https?:\/\//i

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type RequestBody = FormData | object | undefined

export interface ApiError {
  status: number
  error: string
  message?: string
  issues?: unknown
}

type SessionExpiredListener = () => void
const sessionExpiredListeners = new Set<SessionExpiredListener>()
let refreshInFlight: Promise<boolean> | null = null

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'status' in value && 'error' in value
}

/** Convierte una ruta de archivo servida por el backend (p. ej. /uploads/x.jpg) en URL utilizable. */
export function apiAssetUrl(path: string): string {
  return ABSOLUTE_URL.test(path) ? path : `${API_BASE_URL}${path}`
}

/** Suscribe a la expiración definitiva de la sesión (refresh rechazado). Devuelve la desuscripción. */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener)
  return () => sessionExpiredListeners.delete(listener)
}

/** Renueva los tokens una sola vez aunque varias peticiones fallen con 401 a la vez. */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= requestNewTokens().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

async function requestNewTokens(): Promise<boolean> {
  const refresh_token = getRefreshToken()
  if (!refresh_token) return false
  try {
    saveTokens(await sendRequest<SessionTokens>('POST', REFRESH_PATH, { refresh_token }))
    return true
  } catch {
    expireSession()
    return false
  }
}

function expireSession(): void {
  clearTokens()
  sessionExpiredListeners.forEach((listener) => listener())
}

function buildRequestInit(method: HttpMethod, body: RequestBody): RequestInit {
  const accessToken = getAccessToken()
  const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
  if (body === undefined) return { method, headers }
  if (body instanceof FormData) return { method, headers, body }
  return { method, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

async function parsePayload(res: Response): Promise<unknown> {
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json')
  return isJson ? res.json() : null
}

function toApiError(status: number, payload: unknown): ApiError {
  const body = (payload ?? {}) as Partial<ApiError>
  return { status, error: body.error ?? 'HttpError', message: body.message, issues: body.issues }
}

async function sendRequest<T>(method: HttpMethod, path: string, body?: RequestBody): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, buildRequestInit(method, body))
  const payload = await parsePayload(res)
  if (!res.ok) throw toApiError(res.status, payload)
  return payload as T
}

function isExpiredAccessToken(error: unknown, path: string): boolean {
  return (
    isApiError(error) &&
    error.status === HTTP_UNAUTHORIZED &&
    !PATHS_WITHOUT_REFRESH.has(path) &&
    getRefreshToken() !== null
  )
}

async function request<T>(method: HttpMethod, path: string, body?: RequestBody): Promise<T> {
  try {
    return await sendRequest<T>(method, path, body)
  } catch (error) {
    if (!isExpiredAccessToken(error, path) || !(await refreshSession())) throw error
    return sendRequest<T>(method, path, body)
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: RequestBody) => request<T>('POST', path, body),
  put: <T>(path: string, body?: RequestBody) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: RequestBody) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
}
