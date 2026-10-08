/**
 * Comportamiento común de los <dialog> modales de la landing (reserva, historias, galería, lista):
 * botones [data-dialogo-cerrar], cierre al tocar el fondo y foco de vuelta al elemento que lo abrió.
 * Escape y el atrapado de foco los da el <dialog> nativo.
 */
export interface Dialogo {
  abrir: () => void
  cerrar: () => void
}

export function prepararDialogo(dialogo: HTMLDialogElement, alCerrar?: () => void): Dialogo {
  let disparador: HTMLElement | null = null

  dialogo.querySelectorAll<HTMLElement>('[data-dialogo-cerrar]').forEach((boton) => {
    boton.addEventListener('click', () => dialogo.close())
  })
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) dialogo.close()
  })
  dialogo.addEventListener('close', () => {
    alCerrar?.()
    disparador?.focus()
  })

  return {
    abrir() {
      disparador = document.activeElement instanceof HTMLElement ? document.activeElement : null
      if (!dialogo.open) dialogo.showModal()
    },
    cerrar: () => dialogo.close(),
  }
}
