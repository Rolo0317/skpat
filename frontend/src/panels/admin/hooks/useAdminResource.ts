import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Identified {
  id: string
}

/**
 * CRUD estándar del panel (GET/POST colección, PATCH/DELETE por id) sobre React Query.
 * La clave de caché es la propia ruta, así cada recurso se invalida solo.
 */
export function useAdminResource<T extends Identified, Input extends object>(path: string) {
  const queryClient = useQueryClient()
  const queryKey = [path]
  const query = useQuery({ queryKey, queryFn: () => api.get<T[]>(path) })
  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const create = useMutation({ mutationFn: (input: Input) => api.post<T>(path, input), onSuccess: invalidate })
  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<Input> }) => api.patch<T>(`${path}/${id}`, changes),
    onSuccess: invalidate,
  })
  const remove = useMutation({ mutationFn: (id: string) => api.del<unknown>(`${path}/${id}`), onSuccess: invalidate })

  return { items: query.data ?? [], isLoading: query.isLoading, error: query.error, create, update, remove }
}
