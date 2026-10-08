import { useEffect } from 'react'

/** Sale del router de React con una navegación completa (p. ej. hacia la landing servida por Astro). */
export function FullPageRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])
  return null
}
