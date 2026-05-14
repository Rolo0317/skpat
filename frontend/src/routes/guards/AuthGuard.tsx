import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'

export function AuthGuard() {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8 text-white">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
