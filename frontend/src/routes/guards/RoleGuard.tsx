import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import type { SkpatRole } from '@/features/auth/AuthContext'

export interface RoleGuardProps {
  allowedRoles: SkpatRole[]
  redirectTo?: string
}

export function RoleGuard({ allowedRoles, redirectTo = '/login' }: RoleGuardProps) {
  const { user, role, loading } = useAuth()

  if (loading) return <div data-testid="auth-loading" className="p-8 text-white">Cargando...</div>
  if (!user) return <Navigate to={redirectTo} replace />
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/unauthorized" replace />

  return <Outlet />
}
