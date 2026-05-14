import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'

export default function MeseroLayout() {
  const { user, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 p-4 flex items-center justify-between">
        <Link to="/mesero" className="text-xl font-bold">Skpat — Mesero</Link>
        <div className="flex items-center gap-4 text-sm">
          <span>{user?.email}</span>
          <button onClick={signOut} className="rounded bg-neutral-800 px-3 py-1 hover:bg-neutral-700">
            Salir
          </button>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
