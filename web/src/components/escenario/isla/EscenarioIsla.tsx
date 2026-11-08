import { Suspense, lazy, useEffect, useState } from 'react'
import { soportaWebGL2 } from '../capacidad'

/** three.js y R3F viajan en un chunk aparte: se piden solo si hay WebGL2. */
const Lienzo = lazy(() => import('./Lienzo'))

const CLASE_LISTO = 'escenario--3d'

/**
 * Isla de Astro del escenario 3D. En el servidor no pinta nada (la versión 2.5D ya está en el HTML);
 * en el navegador comprueba WebGL2, monta el lienzo y, cuando hay cuadros, avisa al contenedor para el fundido.
 */
export default function EscenarioIsla() {
  const [montar, setMontar] = useState(false)

  useEffect(() => {
    if (soportaWebGL2()) setMontar(true)
  }, [])

  const alEstarListo = () => {
    document.querySelector('[data-escenario]')?.classList.add(CLASE_LISTO)
  }
  // Sin rendimiento o sin contexto WebGL: vuelve la 2.5D y se libera la GPU desmontando el lienzo.
  const alRendirse = () => {
    document.querySelector('[data-escenario]')?.classList.remove(CLASE_LISTO)
    setMontar(false)
  }

  if (!montar) return null
  return (
    <Suspense fallback={null}>
      <Lienzo alEstarListo={alEstarListo} alRendirse={alRendirse} />
    </Suspense>
  )
}
