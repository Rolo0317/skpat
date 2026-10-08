import { crearVisor } from './visor'

interface FotoVisor {
  url: string
  texto: string
}

function leerFotos(raiz: HTMLElement): FotoVisor[] {
  try {
    const datos = raiz.querySelector('[data-galeria-fotos]')?.textContent ?? '[]'
    return JSON.parse(datos) as FotoVisor[]
  } catch {
    return []
  }
}

/** Caja de luz accesible: la foto grande solo se descarga al abrirla. */
export function iniciarGaleria(raiz: HTMLElement): void {
  const dialogo = raiz.querySelector<HTMLDialogElement>('[data-galeria-visor]')
  const imagen = raiz.querySelector<HTMLImageElement>('[data-galeria-imagen]')
  const leyenda = raiz.querySelector<HTMLElement>('[data-galeria-leyenda]')
  const fotos = leerFotos(raiz)
  if (!dialogo || !imagen || !leyenda || fotos.length === 0) return

  const visor = crearVisor({
    dialogo,
    total: fotos.length,
    circular: true,
    mostrar(indice) {
      const foto = fotos[indice]
      if (!foto) return
      imagen.src = foto.url
      imagen.alt = foto.texto
      leyenda.textContent = `${foto.texto} · ${indice + 1} de ${fotos.length}`
    },
  })
  raiz.querySelectorAll<HTMLButtonElement>('[data-galeria-abrir]').forEach((boton) => {
    boton.addEventListener('click', () => visor.abrir(Number(boton.dataset.galeriaAbrir)))
  })
}
