import { Link } from 'react-router-dom'

export function Navbar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center gap-6 px-6 py-3 border-b border-skpat-border backdrop-blur-md"
      style={{ background: '#0a0806cc' }}
    >
      <div className="text-skpat-white font-black tracking-tight">
        SKPAT <span className="text-skpat-oro">VIP</span>
      </div>
      <div className="flex-1" />
      <a
        href="#eventos"
        className="text-skpat-muted text-sm hover:text-skpat-white transition-colors"
      >
        Ver eventos
      </a>
      <Link
        to="/login"
        className="text-skpat-bg text-sm font-semibold px-4 py-1.5 rounded-full"
        style={{ background: 'linear-gradient(135deg, #d4a63a, #f2d38a)' }}
      >
        Comprar tiquetes
      </Link>
    </nav>
  )
}
