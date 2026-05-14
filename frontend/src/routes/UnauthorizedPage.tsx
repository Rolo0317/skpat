import { Link } from 'react-router-dom'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">403 — Acceso no autorizado</h1>
      <p className="text-neutral-400">No tienes permiso para ver esta seccion.</p>
      <Link to="/login" className="underline">
        Volver al login
      </Link>
    </div>
  )
}
