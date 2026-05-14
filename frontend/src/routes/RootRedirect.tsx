import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'

export function RootRedirect() {
  const { user, role, loading } = useAuth()
  if (loading) return <div className="p-8 text-white">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (role === 'admin') return <Navigate to="/admin" replace />
  if (role === 'mesero') return <Navigate to="/mesero" replace />
  if (role === 'portero') return <Navigate to="/portero" replace />
  return <Navigate to="/cliente" replace />
}
