import type { LucideIcon } from 'lucide-react'

interface StatTileProps {
  label: string
  value: string
  icon: LucideIcon
  colorClass: string
  sub?: string
}

/** Tarjeta KPI del dashboard de administración. */
export function StatTile({ label, value, icon: Icon, colorClass, sub }: StatTileProps) {
  return (
    <div className="bg-skpat-card border border-skpat-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-skpat-muted uppercase tracking-widest">{label}</span>
        <Icon size={14} className={colorClass} />
      </div>
      <div className={`text-2xl font-extrabold ${colorClass}`}>{value}</div>
      {sub && <div className="text-xs text-skpat-muted mt-1">{sub}</div>}
    </div>
  )
}
