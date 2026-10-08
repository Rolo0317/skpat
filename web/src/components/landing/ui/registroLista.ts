import { conEnvioEnCurso, enviarJson, leerPersona, mensajeDeError } from './formularioPersona'

/** POST /lists/:slug/registro → 201 */
interface RegistroLista {
  ticket_id: string
  qr_token: string
  qr_data_url: string
  event_title: string
}

const ERRORES_LISTA: Record<string, string> = {
  AlreadyOnList: 'Ese correo ya está en la lista. Busca tu QR en el correo o en tu cuenta.',
  ListClosed: 'La lista se cerró mientras te inscribías.',
  ListFull: 'Se acaban de llenar los cupos de esta lista.',
  ListNotFound: 'Esta lista ya no existe.',
}

/** Formulario de la lista pública: al registrarse muestra el QR para guardarlo. */
export function iniciarRegistroLista(raiz: HTMLElement): void {
  const formulario = raiz.querySelector<HTMLFormElement>('[data-lista-formulario]')
  const error = raiz.querySelector<HTMLElement>('[data-lista-error]')
  const exito = raiz.querySelector<HTMLElement>('[data-lista-exito]')
  const imagen = raiz.querySelector<HTMLImageElement>('[data-lista-qr]')
  const descarga = raiz.querySelector<HTMLAnchorElement>('[data-lista-descarga]')
  const slug = raiz.dataset.slug
  if (!formulario || !error || !exito || !imagen || !descarga || !slug) return

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    if (!formulario.reportValidity()) return
    const ruta = `/lists/${encodeURIComponent(slug)}/registro`
    const respuesta = await conEnvioEnCurso(formulario, () => enviarJson<RegistroLista>(ruta, leerPersona(formulario)))
    if (!respuesta.ok || !respuesta.datos) {
      error.textContent = mensajeDeError(respuesta.codigo, ERRORES_LISTA)
      return
    }
    imagen.src = respuesta.datos.qr_data_url
    imagen.alt = `Tu código QR para ${respuesta.datos.event_title}`
    descarga.href = respuesta.datos.qr_data_url
    formulario.hidden = true
    exito.hidden = false
    exito.focus()
  })
}
