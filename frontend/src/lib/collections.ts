/** Agrupa elementos por la clave que devuelve `keyOf`, conservando el orden de aparición. */
export function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    ;(groups[keyOf(item)] ??= []).push(item)
    return groups
  }, {})
}
