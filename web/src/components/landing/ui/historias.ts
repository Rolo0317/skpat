import { crearVisor } from './visor'

/** Visor de historias estilo Instagram: avanza solo (salvo con movimiento reducido) y marca las vistas. */
const DURACION_HISTORIA_MS = 6000
const CLAVE_VISTAS = 'skpat:historias-vistas'

function leerVistas(): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(CLAVE_VISTAS) ?? '[]'))
  } catch {
    return new Set()
  }
}

function guardarVista(id: string): void {
  try {
    const vistas = leerVistas().add(id)
    localStorage.setItem(CLAVE_VISTAS, JSON.stringify([...vistas]))
  } catch {
    /* Sin almacenamiento (modo privado): solo se pierde la marca de "vista". */
  }
}

export function iniciarHistorias(raiz: HTMLElement): void {
  const dialogo = raiz.querySelector<HTMLDialogElement>('[data-historias-visor]')
  const circulos = [...raiz.querySelectorAll<HTMLButtonElement>('[data-historia-abrir]')]
  const diapositivas = [...raiz.querySelectorAll<HTMLElement>('[data-historia]')]
  const barras = [...raiz.querySelectorAll<HTMLElement>('[data-historia-barra]')]
  if (!dialogo || diapositivas.length === 0) return

  dialogo.style.setProperty('--duracion-historia', `${DURACION_HISTORIA_MS}ms`)
  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const vistas = leerVistas()
  circulos.forEach((circulo) => circulo.toggleAttribute('data-vista', vistas.has(circulo.dataset.id ?? '')))
  let temporizador: number | undefined

  function mostrar(indice: number): void {
    diapositivas.forEach((diapositiva, posicion) => (diapositiva.hidden = posicion !== indice))
    barras.forEach((barra, posicion) => {
      barra.dataset.estado = posicion < indice ? 'vista' : posicion === indice ? 'actual' : 'pendiente'
    })
    const circulo = circulos[indice]
    if (circulo?.dataset.id) {
      guardarVista(circulo.dataset.id)
      circulo.setAttribute('data-vista', '')
    }
    window.clearTimeout(temporizador)
    if (!sinMovimiento) temporizador = window.setTimeout(() => visor.siguiente(), DURACION_HISTORIA_MS)
  }

  const visor = crearVisor({
    dialogo,
    total: diapositivas.length,
    mostrar,
    circular: false,
    alCerrar: () => window.clearTimeout(temporizador),
  })
  circulos.forEach((circulo, indice) => circulo.addEventListener('click', () => visor.abrir(indice)))
}
