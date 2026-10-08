import type { Gestor } from '@/lib/operacion'
import { useAdminResource } from './useAdminResource'

export const PROMOTERS_PATH = '/admin/promoters'

export type GestorInput = Omit<Gestor, 'id'>

export function usePromoters() {
  return useAdminResource<Gestor, GestorInput>(PROMOTERS_PATH)
}
