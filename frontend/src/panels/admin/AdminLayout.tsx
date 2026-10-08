import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, UtensilsCrossed, Package, LogOut, Wallet, ListChecks, Users, Images,
  Megaphone, Settings, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { usePendingPayments } from './pagos/usePendingPayments'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  /** Muestra el contador de pagos por confirmar. */
  showsPendingCount?: boolean
}

const navItems: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/pagos', label: 'Pagos pendientes', icon: Wallet, showsPendingCount: true },
  { to: '/admin/eventos', label: 'Eventos', icon: CalendarDays },
  { to: '/admin/listas', label: 'Listas', icon: ListChecks },
  { to: '/admin/gestores', label: 'Gestores', icon: Users },
  { to: '/admin/galeria', label: 'Galería', icon: Images },
  { to: '/admin/anuncios', label: 'Anuncios', icon: Megaphone },
  { to: '/admin/menu', label: 'Carta Digital', icon: UtensilsCrossed },
  { to: '/admin/inventario', label: 'Inventario', icon: Package },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
]

function PendingBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="ml-auto min-w-6 rounded-full bg-skpat-oro px-1.5 py-0.5 text-center text-[11px] font-black text-skpat-bg" aria-label={`${count} pagos pendientes`}>
      {count}
    </span>
  )
}

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const { count } = usePendingPayments()

  return (
    <div className="flex min-h-screen flex-col bg-skpat-bg text-skpat-text md:flex-row">
      <aside className="shrink-0 border-b border-skpat-border bg-skpat-bg2 md:flex md:w-60 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:block md:border-b md:border-skpat-border md:px-5 md:py-5">
          <div>
            <div className="text-lg font-black tracking-tight text-skpat-oro">SKPAT</div>
            <div className="text-[10px] uppercase tracking-widest text-skpat-muted">Panel de operación</div>
          </div>
          <button onClick={signOut} className="rounded-lg p-2 text-skpat-muted hover:text-skpat-red md:hidden" aria-label="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>

        <nav aria-label="Secciones del panel" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:space-y-0.5 md:overflow-visible md:py-4">
          {navItems.map(({ to, label, icon: Icon, end, showsPendingCount }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-skpat-oro/15 text-skpat-oro' : 'text-skpat-muted hover:bg-white/5 hover:text-skpat-text'
                }`
              }
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
              {showsPendingCount && <PendingBadge count={count} />}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-skpat-border px-3 py-4 md:block">
          <div className="mb-2 truncate px-3 text-[11px] text-skpat-muted">{user?.email}</div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-skpat-muted transition-colors hover:bg-skpat-red/10 hover:text-skpat-red"
          >
            <LogOut size={15} aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
