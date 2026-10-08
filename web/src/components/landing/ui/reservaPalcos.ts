import { prepararDialogo } from './dialogo'
import { conEnvioEnCurso, enviarJson, leerPersona, mensajeDeError } from './formularioPersona'
import { enlaceWhatsapp } from '../utilidades/whatsapp'

/** Lo que el plano entrega al formulario de cada puesto (data-datos, en JSON). */
export interface DatosPuesto {
  eventoId: string
  spotId: string
  nombre: string
  fecha: string
  evento: string
  precio: string
  capacidad: number
  incluye: string[]
}

/** POST /events/:id/ubicaciones/:spotId/reservar → 201 */
interface ReservaCreada {
  reservation_id: string
  status: 'pending_payment'
  price_cents: number
  whatsapp_url: string | null
}

const ERRORES_RESERVA: Record<string, string> = {
  SpotTaken: 'Alguien lo acaba de apartar. Elige otro puesto disponible.',
  OfferNotFound: 'Este puesto aún no tiene precio publicado. Escríbenos por WhatsApp.',
  SpotNotFound: 'Este puesto ya no está disponible. Recarga la página.',
  EventNotActive: 'Este evento ya no está a la venta.',
  EventNotFound: 'Este evento ya no está a la venta.',
}

const AVISO_NO_DISPONIBLE: Record<string, string> = {
  reservado: 'está reservado, pendiente de pago',
  vendido: 'ya está vendido',
}

interface Elementos {
  dialogo: HTMLDialogElement
  formulario: HTMLFormElement
  error: HTMLElement
  exito: HTMLElement
  enlaceWhatsapp: HTMLAnchorElement
  anuncio: HTMLElement
}

function buscarElementos(raiz: HTMLElement): Elementos | null {
  const dialogo = raiz.querySelector<HTMLDialogElement>('[data-reserva-dialogo]')
  const formulario = raiz.querySelector<HTMLFormElement>('[data-reserva-formulario]')
  const error = raiz.querySelector<HTMLElement>('[data-reserva-error]')
  const exito = raiz.querySelector<HTMLElement>('[data-reserva-exito]')
  const enlace = raiz.querySelector<HTMLAnchorElement>('[data-reserva-whatsapp]')
  const anuncio = raiz.querySelector<HTMLElement>('[data-plano-anuncio]')
  if (!dialogo || !formulario || !error || !exito || !enlace || !anuncio) return null
  return { dialogo, formulario, error, exito, enlaceWhatsapp: enlace, anuncio }
}

function rellenar(dialogo: HTMLElement, campo: string, valor: string): void {
  dialogo.querySelectorAll<HTMLElement>(`[data-campo="${campo}"]`).forEach((nodo) => {
    nodo.textContent = valor
  })
}

function pintarIncluye(dialogo: HTMLElement, incluye: string[]): void {
  const lista = dialogo.querySelector<HTMLUListElement>('[data-campo-incluye]')
  if (!lista) return
  lista.replaceChildren(
    ...incluye.map((item) => {
      const elemento = document.createElement('li')
      elemento.textContent = item
      return elemento
    }),
  )
}

function leerDatos(boton: HTMLElement): DatosPuesto | null {
  try {
    return boton.dataset.datos ? (JSON.parse(boton.dataset.datos) as DatosPuesto) : null
  } catch {
    return null
  }
}

function marcarReservado(boton: HTMLElement): void {
  boton.dataset.estado = 'reservado'
  boton.classList.replace('puesto--disponible', 'puesto--reservado')
  boton.setAttribute('aria-disabled', 'true')
  boton.setAttribute('aria-label', `${boton.dataset.nombre ?? 'Puesto'}: ${AVISO_NO_DISPONIBLE.reservado}`)
}

function mostrarPaso(elementos: Elementos, paso: 'formulario' | 'exito'): void {
  elementos.formulario.hidden = paso !== 'formulario'
  elementos.exito.hidden = paso !== 'exito'
}

/** Enlace de respaldo si el backend no encontró gestor (whatsapp_url null). */
function whatsappDeRespaldo(dialogo: HTMLElement, puesto: DatosPuesto, referencia: string): string {
  const numero = dialogo.dataset.whatsappRespaldo ?? ''
  const mensaje = `Hola Skpat VIP, aparté ${puesto.nombre} para ${puesto.evento} (${puesto.fecha}). Referencia: ${referencia}`
  return enlaceWhatsapp(numero, mensaje)
}

/** Plano interactivo: tocar un puesto disponible abre el formulario; al reservar se continúa por WhatsApp. */
export function iniciarReservas(raiz: HTMLElement): void {
  const elementos = buscarElementos(raiz)
  if (!elementos) return
  const { dialogo, formulario, error, anuncio } = elementos
  const control = prepararDialogo(dialogo)
  let actual: { boton: HTMLElement; puesto: DatosPuesto } | null = null

  const abrir = (boton: HTMLElement, puesto: DatosPuesto): void => {
    actual = { boton, puesto }
    rellenar(dialogo, 'nombre', puesto.nombre)
    rellenar(dialogo, 'fecha', `${puesto.evento} · ${puesto.fecha}`)
    rellenar(dialogo, 'precio', puesto.precio)
    rellenar(dialogo, 'capacidad', `Hasta ${puesto.capacidad} personas · un QR por persona`)
    pintarIncluye(dialogo, puesto.incluye)
    error.textContent = ''
    mostrarPaso(elementos, 'formulario')
    control.abrir()
  }

  raiz.querySelectorAll<HTMLElement>('[data-puesto]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const puesto = leerDatos(boton)
      const estado = boton.dataset.estado ?? 'vendido'
      if (estado === 'disponible' && puesto) return abrir(boton, puesto)
      const motivo = puesto ? AVISO_NO_DISPONIBLE[estado] : 'aún no tiene precio publicado'
      anuncio.textContent = `${boton.dataset.nombre ?? 'Este puesto'} ${motivo}.`
    })
  })

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    if (!actual || !formulario.reportValidity()) return
    const { boton, puesto } = actual
    const ruta = `/events/${encodeURIComponent(puesto.eventoId)}/ubicaciones/${encodeURIComponent(puesto.spotId)}/reservar`
    const respuesta = await conEnvioEnCurso(formulario, () => enviarJson<ReservaCreada>(ruta, leerPersona(formulario)))
    if (!respuesta.ok || !respuesta.datos) {
      error.textContent = mensajeDeError(respuesta.codigo, ERRORES_RESERVA)
      if (respuesta.codigo === 'SpotTaken') marcarReservado(boton)
      return
    }
    const { reservation_id: referencia, whatsapp_url: urlGestor } = respuesta.datos
    marcarReservado(boton)
    rellenar(dialogo, 'referencia', referencia)
    elementos.enlaceWhatsapp.href = urlGestor ?? whatsappDeRespaldo(dialogo, puesto, referencia)
    mostrarPaso(elementos, 'exito')
    elementos.enlaceWhatsapp.focus()
    window.open(elementos.enlaceWhatsapp.href, '_blank', 'noopener')
  })
}
