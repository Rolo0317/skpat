import type { DatosAsistente, TemaAsistente } from './respuestas'
import { enlaceWhatsapp } from '~/components/landing/utilidades/whatsapp'

/** Chat de respuestas rápidas: muestra la respuesta del tema y cierra con "Continuar por WhatsApp". */
interface Elementos {
  lanzador: HTMLButtonElement
  panel: HTMLElement
  conversacion: HTMLElement
  cierre: HTMLElement
  gestores: HTMLElement
}

function buscarElementos(raiz: HTMLElement): Elementos | null {
  const lanzador = raiz.querySelector<HTMLButtonElement>('[data-asistente-lanzador]')
  const panel = raiz.querySelector<HTMLElement>('[data-asistente-panel]')
  const conversacion = raiz.querySelector<HTMLElement>('[data-asistente-conversacion]')
  const cierre = raiz.querySelector<HTMLElement>('[data-asistente-cierre]')
  const gestores = raiz.querySelector<HTMLElement>('[data-asistente-gestores]')
  return lanzador && panel && conversacion && cierre && gestores ? { lanzador, panel, conversacion, cierre, gestores } : null
}

function leerDatos(raiz: HTMLElement): DatosAsistente | null {
  try {
    return JSON.parse(raiz.querySelector('[data-asistente-datos]')?.textContent ?? 'null') as DatosAsistente | null
  } catch {
    return null
  }
}

function burbuja(autor: 'usuario' | 'skpat', texto: string): HTMLElement {
  const elemento = document.createElement('p')
  elemento.className = `burbuja burbuja--${autor}`
  elemento.textContent = texto
  return elemento
}

function enlaceInterno(enlace: NonNullable<TemaAsistente['enlace']>, alNavegar: () => void): HTMLElement {
  const elemento = document.createElement('a')
  elemento.className = 'burbuja__enlace'
  elemento.href = enlace.url
  elemento.textContent = `${enlace.texto} →`
  elemento.addEventListener('click', alNavegar)
  return elemento
}

function pintarGestores(contenedor: HTMLElement, datos: DatosAsistente, tema: TemaAsistente): void {
  contenedor.replaceChildren(
    ...datos.gestores.map((gestor) => {
      const enlace = document.createElement('a')
      enlace.className = 'asistente__gestor'
      enlace.href = enlaceWhatsapp(gestor.whatsapp, tema.mensajeWhatsapp)
      enlace.target = '_blank'
      enlace.rel = 'noopener noreferrer'
      enlace.textContent = datos.gestores.length > 1 ? `WhatsApp con ${gestor.nombre}` : 'Continuar por WhatsApp'
      return enlace
    }),
  )
}

export function iniciarAsistente(raiz: HTMLElement): void {
  const elementos = buscarElementos(raiz)
  const datos = leerDatos(raiz)
  if (!elementos || !datos) return
  const { lanzador, panel, conversacion, cierre, gestores } = elementos

  function alternar(abrir: boolean): void {
    panel.hidden = !abrir
    lanzador.setAttribute('aria-expanded', String(abrir))
    if (abrir) panel.querySelector<HTMLElement>('[data-tema]')?.focus()
    else lanzador.focus()
  }

  const responder = (tema: TemaAsistente): void => {
    const respuesta = burbuja('skpat', tema.respuesta)
    if (tema.enlace) respuesta.append(' ', enlaceInterno(tema.enlace, () => alternar(false)))
    const pregunta = burbuja('usuario', tema.pregunta)
    conversacion.append(pregunta, respuesta)
    pintarGestores(gestores, datos, tema)
    cierre.hidden = false
    conversacion.scrollTop = pregunta.offsetTop - conversacion.offsetTop
  }

  lanzador.addEventListener('click', () => alternar(panel.hidden))
  raiz.querySelector('[data-asistente-cerrar]')?.addEventListener('click', () => alternar(false))
  panel.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') alternar(false)
  })
  raiz.querySelectorAll<HTMLButtonElement>('[data-tema]').forEach((boton) => {
    const tema = datos.temas.find((item) => item.id === boton.dataset.tema)
    if (tema) boton.addEventListener('click', () => responder(tema))
  })
}
