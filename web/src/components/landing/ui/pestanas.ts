/**
 * Pestañas accesibles (patrón WAI-ARIA): [role=tablist] con [role=tab] que apuntan con aria-controls a su panel.
 * Flechas izquierda/derecha, Inicio y Fin mueven la selección.
 */
const TECLAS_DE_MOVIMIENTO: Record<string, (indice: number, total: number) => number> = {
  ArrowRight: (indice, total) => (indice + 1) % total,
  ArrowLeft: (indice, total) => (indice - 1 + total) % total,
  Home: () => 0,
  End: (_, total) => total - 1,
}

export function iniciarPestanas(lista: HTMLElement): void {
  const pestanas = [...lista.querySelectorAll<HTMLButtonElement>('[role="tab"]')]

  function seleccionar(elegida: HTMLButtonElement): void {
    for (const pestana of pestanas) {
      const activa = pestana === elegida
      pestana.setAttribute('aria-selected', String(activa))
      pestana.tabIndex = activa ? 0 : -1
      const panel = document.getElementById(pestana.getAttribute('aria-controls') ?? '')
      if (panel) panel.hidden = !activa
    }
  }

  pestanas.forEach((pestana, indice) => {
    pestana.addEventListener('click', () => seleccionar(pestana))
    pestana.addEventListener('keydown', (evento) => {
      const mover = TECLAS_DE_MOVIMIENTO[evento.key]
      const destino = mover ? pestanas[mover(indice, pestanas.length)] : undefined
      if (!destino) return
      evento.preventDefault()
      seleccionar(destino)
      destino.focus()
    })
  })
}
