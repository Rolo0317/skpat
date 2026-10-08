/** Cachea en memoria el resultado de `load` durante `ttlMs`; las llamadas concurrentes comparten la misma promesa. */
export function memoizeFor<T>(ttlMs: number, load: () => Promise<T>, now: () => number = Date.now) {
  let cached: { value: Promise<T>; expiresAt: number } | undefined

  const get = (): Promise<T> => {
    if (cached && cached.expiresAt > now()) return cached.value
    const value = load()
    cached = { value, expiresAt: now() + ttlMs }
    value.catch(() => { cached = undefined })
    return value
  }

  return Object.assign(get, { clear: () => { cached = undefined } })
}
