import type { SkpatRole } from '@/features/auth/AuthContext'

/** Panel de inicio de cada rol tras autenticarse. */
export const PANEL_PATH_BY_ROLE: Record<SkpatRole, string> = {
  admin: '/admin',
  mesero: '/mesero',
  portero: '/portero',
  cliente: '/cliente',
}
