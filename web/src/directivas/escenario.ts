import type { ClientDirective } from 'astro'
import { CONSULTA_ESCENARIO_3D, debeCargar3D } from '../components/escenario/capacidad'

/** Margen para que el navegador termine lo importante (LCP, fuentes) antes de pedir three.js. */
const ESPERA_MAXIMA_MS = 2500
const ESPERA_SIN_IDLE_MS = 1200

interface ConexionConAhorro {
  saveData?: boolean
}

/**
 * `client:escenario`: hidrata la isla solo en escritorio, sin movimiento reducido ni ahorro de datos,
 * y siempre después del evento load y de un momento libre del hilo principal. Así la isla nunca compite con el LCP.
 */
const escenario: ClientDirective = (cargar) => {
  const conexion = (navigator as Navigator & { connection?: ConexionConAhorro }).connection
  const cumple = debeCargar3D({
    coincideConsulta: window.matchMedia(CONSULTA_ESCENARIO_3D).matches,
    ahorroDeDatos: Boolean(conexion?.saveData),
    nucleos: navigator.hardwareConcurrency || 0,
  })
  if (!cumple) return

  const hidratar = async () => {
    const montar = await cargar()
    await montar()
  }
  const cuandoHayaCalma = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => void hidratar(), { timeout: ESPERA_MAXIMA_MS })
    else window.setTimeout(() => void hidratar(), ESPERA_SIN_IDLE_MS)
  }
  if (document.readyState === 'complete') cuandoHayaCalma()
  else window.addEventListener('load', cuandoHayaCalma, { once: true })
}

export default escenario
