// Mismo origen por defecto: Astro sirve la API en /api. VITE_API_URL permite apuntar a otro backend.
const BASE = import.meta.env.VITE_API_URL ?? '/api'

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('skpat_access')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface ApiError {
  status: number
  error: string
  message?: string
  issues?: unknown
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeader(),
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json')
  const payload = isJson ? await res.json() : null
  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      error: payload?.error ?? 'HttpError',
      message: payload?.message,
      issues: payload?.issues,
    }
    throw err
  }
  return payload as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
}
