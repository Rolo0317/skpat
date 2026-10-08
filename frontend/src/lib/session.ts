/**
 * Almacén de tokens de sesión. Única puerta de acceso a localStorage para la autenticación:
 * nunca se toca en tiempo de importación (seguro bajo SSR de Astro) y tolera navegadores
 * que bloquean el almacenamiento.
 */
const ACCESS_KEY = 'skpat_access'
const REFRESH_KEY = 'skpat_refresh'

export interface SessionTokens {
  access_token: string
  refresh_token?: string
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function getAccessToken(): string | null {
  return storage()?.getItem(ACCESS_KEY) ?? null
}

export function getRefreshToken(): string | null {
  return storage()?.getItem(REFRESH_KEY) ?? null
}

export function saveTokens({ access_token, refresh_token }: SessionTokens): void {
  const store = storage()
  store?.setItem(ACCESS_KEY, access_token)
  if (refresh_token) store?.setItem(REFRESH_KEY, refresh_token)
}

export function clearTokens(): void {
  const store = storage()
  store?.removeItem(ACCESS_KEY)
  store?.removeItem(REFRESH_KEY)
}
