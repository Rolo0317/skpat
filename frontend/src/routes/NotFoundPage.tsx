import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">404 — Pagina no encontrada</h1>
      <Link to="/" reloadDocument className="underline">
        Inicio
      </Link>
    </div>
  )
}
