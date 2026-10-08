import { NEGOCIO } from '../contenido/negocio'
import { DURACION_NOCHE_MIN, estadoDeLaNoche, horaDeLaNoche, tarifaEnMinuto, type EstadoNoche } from '../contenido/tarifas'
import { formatoCOP } from '../utilidades/formato'
import { MS_POR_MINUTO } from '../utilidades/tiempoBogota'

export const PASO_MINUTOS = 15
const PORCENTAJE = 100
const HORA_APERTURA = horaDeLaNoche(0)

/** Texto que encabeza el precio según el momento de la noche. Lo usan el servidor y el navegador. */
export function textoDeEstado(estado: EstadoNoche): string {
  if (estado.tipo === 'abierto') return `Ahora mismo, ${horaDeLaNoche(estado.minutoDeNoche)} en Bogotá`
  if (estado.tipo === 'abre-hoy') return `Hoy abrimos a las ${HORA_APERTURA}. Si llegas a esa hora:`
  return `Abrimos ${NEGOCIO.horario.dias.toLowerCase()} a las ${HORA_APERTURA}. Si llegas temprano:`
}

export function minutoInicial(estado: EstadoNoche): number {
  return estado.tipo === 'abierto' ? estado.minutoDeNoche - (estado.minutoDeNoche % PASO_MINUTOS) : 0
}

export function porcentajeDeNoche(minutoDeNoche: number): number {
  return (minutoDeNoche / DURACION_NOCHE_MIN) * PORCENTAJE
}

export function descripcionParaLector(minutoDeNoche: number): string {
  const tarifa = tarifaEnMinuto(minutoDeNoche)
  return `${horaDeLaNoche(minutoDeNoche)}: tarifa ${tarifa.nombre}, ${formatoCOP(tarifa.precioCentavos)}`
}

interface ElementosLinea {
  raiz: HTMLElement
  control: HTMLInputElement
  estado: HTMLElement
  precio: HTMLElement
  nombre: HTMLElement
}

function buscarElementos(raiz: HTMLElement): ElementosLinea | null {
  const control = raiz.querySelector<HTMLInputElement>('[data-control]')
  const estado = raiz.querySelector<HTMLElement>('[data-estado-texto]')
  const precio = raiz.querySelector<HTMLElement>('[data-precio]')
  const nombre = raiz.querySelector<HTMLElement>('[data-nombre]')
  return control && estado && precio && nombre ? { raiz, control, estado, precio, nombre } : null
}

function mostrarMinuto(elementos: ElementosLinea, minutoDeNoche: number): void {
  const tarifa = tarifaEnMinuto(minutoDeNoche)
  elementos.precio.textContent = formatoCOP(tarifa.precioCentavos)
  elementos.nombre.textContent = `Tarifa ${tarifa.nombre} · ${tarifa.rango}`
  elementos.control.setAttribute('aria-valuetext', descripcionParaLector(minutoDeNoche))
  elementos.raiz.querySelectorAll<HTMLElement>('[data-tarifa]').forEach((nodo) => {
    nodo.toggleAttribute('data-activa', nodo.dataset.tarifa === tarifa.id)
  })
}

function sincronizarConReloj(elementos: ElementosLinea): void {
  const estado = estadoDeLaNoche(new Date())
  const minuto = minutoInicial(estado)
  elementos.estado.textContent = textoDeEstado(estado)
  elementos.control.value = String(minuto)
  elementos.raiz.dataset.abierto = String(estado.tipo === 'abierto')
  if (estado.tipo === 'abierto') elementos.raiz.style.setProperty('--ahora', `${porcentajeDeNoche(estado.minutoDeNoche)}%`)
  mostrarMinuto(elementos, minuto)
}

/** La página puede venir de caché: al cargar se recalcula con el reloj real del visitante. */
export function iniciarLineaTarifas(raiz: HTMLElement): void {
  const elementos = buscarElementos(raiz)
  if (!elementos) return
  let explorando = false
  elementos.control.addEventListener('input', () => {
    explorando = true
    elementos.estado.textContent = `Si llegas a las ${horaDeLaNoche(Number(elementos.control.value))}`
    mostrarMinuto(elementos, Number(elementos.control.value))
  })
  sincronizarConReloj(elementos)
  window.setInterval(() => explorando || sincronizarConReloj(elementos), MS_POR_MINUTO)
}
