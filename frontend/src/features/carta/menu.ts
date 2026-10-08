import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface MenuItem {
  id: string
  name: string
  description: string | null
  category: string
  price_cents: number
  sort_order: number
}

export const MENU_QUERY_KEY = ['menu'] as const

/** Carta pública activa, compartida por la mesa del cliente y el panel del mesero. */
export function useMenu() {
  return useQuery({ queryKey: MENU_QUERY_KEY, queryFn: () => api.get<MenuItem[]>('/menu') })
}
