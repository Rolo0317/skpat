import { useCallback, useState } from 'react'

/** Estado de un formulario plano: valores, cambio por campo y reinicio (vacío o con un registro a editar). */
export function useFormState<T extends object>(empty: T) {
  const [values, setValues] = useState<T>(empty)
  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
  }, [])
  const reset = useCallback((next: T = empty) => setValues(next), [empty])
  return { values, setField, reset }
}
