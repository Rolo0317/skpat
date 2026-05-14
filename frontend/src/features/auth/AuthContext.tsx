import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'

export type SkpatRole = 'cliente' | 'mesero' | 'portero' | 'admin'

export interface AuthUser {
  id: string
  email: string
  role: SkpatRole
  nombre: string
}

export interface AuthContextValue {
  user: AuthUser | null
  role: SkpatRole | null
  loading: boolean
  signIn(email: string, password: string): Promise<{ error: string | null }>
  signUp(input: {
    email: string
    password: string
    nombre: string
    cedula: string
    telefono: string
  }): Promise<{ error: string | null }>
  signOut(): Promise<void>
  refreshToken(): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const ACCESS_KEY = 'skpat_access'
const REFRESH_KEY = 'skpat_refresh'

interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: { id: string; email: string; role: SkpatRole }
}

interface MeResponse {
  id: string
  email: string
  role: SkpatRole
  nombre: string
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount: restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem(ACCESS_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get<MeResponse>('/auth/me')
      .then((me) => {
        setUser({ id: me.id, email: me.email, role: me.role, nombre: me.nombre })
      })
      .catch(() => {
        // Token expired or invalid — attempt refresh
        const refreshTk = localStorage.getItem(REFRESH_KEY)
        if (!refreshTk) {
          localStorage.removeItem(ACCESS_KEY)
          localStorage.removeItem(REFRESH_KEY)
          return
        }
        return api
          .post<{ access_token: string }>('/auth/refresh', { refresh_token: refreshTk })
          .then(({ access_token }) => {
            localStorage.setItem(ACCESS_KEY, access_token)
            return api.get<MeResponse>('/auth/me')
          })
          .then((me) => {
            setUser({ id: me.id, email: me.email, role: me.role, nombre: me.nombre })
          })
          .catch(() => {
            localStorage.removeItem(ACCESS_KEY)
            localStorage.removeItem(REFRESH_KEY)
          })
      })
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      loading,
      async signIn(email, password) {
        try {
          const out = await api.post<LoginResponse>('/auth/login', { email, password })
          localStorage.setItem(ACCESS_KEY, out.access_token)
          localStorage.setItem(REFRESH_KEY, out.refresh_token)
          const me = await api.get<MeResponse>('/auth/me')
          setUser({ id: me.id, email: me.email, role: me.role, nombre: me.nombre })
          return { error: null }
        } catch (e: unknown) {
          const err = e as { error?: string; message?: string }
          return {
            error:
              err?.error === 'InvalidCredentials'
                ? 'Credenciales invalidas'
                : (err?.message ?? 'Login fallo'),
          }
        }
      },
      async signUp(input) {
        try {
          await api.post('/auth/register', input)
        } catch (e: unknown) {
          const err = e as { message?: string }
          return { error: err?.message ?? 'Registro fallo' }
        }
        // After register, log in automatically
        try {
          const out = await api.post<LoginResponse>('/auth/login', {
            email: input.email,
            password: input.password,
          })
          localStorage.setItem(ACCESS_KEY, out.access_token)
          localStorage.setItem(REFRESH_KEY, out.refresh_token)
          const me = await api.get<MeResponse>('/auth/me')
          setUser({ id: me.id, email: me.email, role: me.role, nombre: me.nombre })
          return { error: null }
        } catch (e: unknown) {
          const err = e as { message?: string }
          return { error: err?.message ?? 'Login fallo tras registro' }
        }
      },
      async signOut() {
        localStorage.removeItem(ACCESS_KEY)
        localStorage.removeItem(REFRESH_KEY)
        setUser(null)
      },
      async refreshToken() {
        const refreshTk = localStorage.getItem(REFRESH_KEY)
        if (!refreshTk) return
        try {
          const { access_token } = await api.post<{ access_token: string }>('/auth/refresh', {
            refresh_token: refreshTk,
          })
          localStorage.setItem(ACCESS_KEY, access_token)
        } catch {
          localStorage.removeItem(ACCESS_KEY)
          localStorage.removeItem(REFRESH_KEY)
          setUser(null)
        }
      },
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
