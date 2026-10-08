import { prepararDialogo } from './dialogo'

/**
 * Visor a pantalla completa sobre un <dialog>: navegación con [data-visor-anterior]/[data-visor-siguiente]
 * y con las flechas del teclado. Lo comparten las historias y la galería.
 */
export interface OpcionesVisor {
  dialogo: HTMLDialogElement
  total: number
  mostrar: (indice: number) => void
  /** true: del último vuelve al primero (galería). false: al pasar del último se cierra (historias). */
  circular: boolean
  alCerrar?: () => void
}

export interface Visor {
  abrir: (indice: number) => void
  siguiente: () => void
}

const PASO_POR_TECLA: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 }

export function crearVisor({ dialogo, total, mostrar, circular, alCerrar }: OpcionesVisor): Visor {
  const control = prepararDialogo(dialogo, alCerrar)
  let actual = 0

  function ir(indice: number): void {
    if (!circular && indice >= total) return control.cerrar()
    if (!circular && indice < 0) return mostrar(actual)
    actual = (indice + total) % total
    mostrar(actual)
  }

  dialogo.addEventListener('keydown', (evento) => {
    const paso = PASO_POR_TECLA[evento.key]
    if (paso === undefined) return
    evento.preventDefault()
    ir(actual + paso)
  })
  dialogo.querySelectorAll('[data-visor-anterior]').forEach((boton) => boton.addEventListener('click', () => ir(actual - 1)))
  dialogo.querySelectorAll('[data-visor-siguiente]').forEach((boton) => boton.addEventListener('click', () => ir(actual + 1)))

  return {
    abrir(indice) {
      actual = indice
      control.abrir()
      mostrar(actual)
    },
    siguiente: () => ir(actual + 1),
  }
}
