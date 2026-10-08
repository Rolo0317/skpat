import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, UtensilsCrossed, Package, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/eventos', label: 'Eventos', icon: CalendarDays },
  { to: '/admin/menu', label: 'Carta Digital', icon: UtensilsCrossed },
  { to: '/admin/inventario', label: 'Inventario', icon: Package },
]

export default function AdminLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-skpat-bg text-skpat-text flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-skpat-bg2 border-r border-skpat-border">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-skpat-border">
          <div className="text-skpat-purple font-black text-lg tracking-tight">SKPAT</div>
          <div className="text-skpat-muted text-[10px] uppercase tracking-widest mt-0.5">Admin Panel</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-skpat-purple/15 text-skpat-purple'
                    : 'text-skpat-muted hover:text-skpat-text hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-skpat-purple' : 'text-skpat-muted group-hover:text-skpat-text'} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={12} className="text-skpat-purple" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-skpat-border">
          <div className="px-3 mb-2">
            <div className="text-[11px] text-skpat-muted truncate">{user?.email}</div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-skpat-muted hover:text-skpat-red hover:bg-skpat-red/8 transition-all"
          >
            <LogOut size={15} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
