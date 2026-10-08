import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PagosPendientes } from '@/lib/operacion'
import { PENDING_PAYMENTS_PATH, PENDING_PAYMENTS_POLL_MS, pendingCount } from './pendingPayments'

export const PENDING_PAYMENTS_QUERY_KEY = [PENDING_PAYMENTS_PATH]

/** Una sola consulta compartida (menú y página) que se refresca cada 15 s. */
export function usePendingPayments() {
  const query = useQuery({
    queryKey: PENDING_PAYMENTS_QUERY_KEY,
    queryFn: () => api.get<PagosPendientes>(PENDING_PAYMENTS_PATH),
    refetchInterval: PENDING_PAYMENTS_POLL_MS,
  })
  return { ...query, count: pendingCount(query.data) }
}
