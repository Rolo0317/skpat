import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, isApiError, onSessionExpired, refreshSession } from '@/lib/api'
import { clearTokens, getAccessToken, saveTokens } from '@/lib/session'

export type SkpatRole = 'cliente' | 'mesero' | 'portero' | 'admin'

export interface AuthUser {
  id: string
  email: string
  role: SkpatRole
  nombre: string
}

export interface SignUpInput {
  email: string
  password: string
  nombre: string
  cedula: string
  telefono: string
}

type AuthResult = { error: string | null }

export interface AuthContextValue {
  user: AuthUser | null
  role: SkpatRole | null
  loading: boolean
  signIn(email: string, password: string): Promise<AuthResult>
  signUp(input: SignUpInput): Promise<AuthResult>
  signOut(): Promise<void>
  refreshToken(): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

const INVALID_CREDENTIALS = 'InvalidCredentials'

function errorMessage(error: unknown, fallback: string): string {
  if (isApiError(error) && error.error === INVALID_CREDENTIALS) return 'Credenciales invalidas'
  return isApiError(error) ? (error.message ?? fallback) : fallback
}

function fetchCurrentUser(): Promise<AuthUser> {
  return api.get<AuthUser>('/auth/me').then(({ id, email, role, nombre }) => ({ id, email, role, nombre }))
}

async function logIn(email: string, password: string): Promise<AuthUser> {
  saveTokens(await api.post<LoginResponse>('/auth/login', { email, password }))
  return fetchCurrentUser()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => onSessionExpired(() => setUser(null)), [])

  // Restaura la sesión guardada; api.ts renueva el token vencido automáticamente.
  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false)
      return
    }
    fetchCurrentUser()
      .then(setUser)
      .catch(clearTokens)
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    async function startSession(email: string, password: string, fallback: string): Promise<AuthResult> {
      try {
        setUser(await logIn(email, password))
        return { error: null }
      } catch (error) {
        return { error: errorMessage(error, fallback) }
      }
    }

    return {
      user,
      role: user?.role ?? null,
      loading,
      signIn: (email, password) => startSession(email, password, 'Login fallo'),
      async signUp(input) {
        try {
          await api.post('/auth/register', input)
        } catch (error) {
          return { error: errorMessage(error, 'Registro fallo') }
        }
        return startSession(input.email, input.password, 'Login fallo tras registro')
      },
      async signOut() {
        clearTokens()
        setUser(null)
      },
      async refreshToken() {
        await refreshSession()
      },
    }
  }, [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
