const MS_POR_SEGUNDO = 1000
const SEGUNDOS_POR_MINUTO = 60
const SEGUNDOS_POR_HORA = 60 * SEGUNDOS_POR_MINUTO
const SEGUNDOS_POR_DIA = 24 * SEGUNDOS_POR_HORA
const DIGITOS_MINIMOS = 2

export type UnidadTiempo = 'dias' | 'horas' | 'minutos' | 'segundos'

/** Descompone el tiempo restante en unidades de reloj (nunca negativas). */
export function tiempoRestante(objetivo: Date, ahora: Date): Record<UnidadTiempo, string> {
  const total = Math.max(0, Math.floor((objetivo.getTime() - ahora.getTime()) / MS_POR_SEGUNDO))
  const rellenar = (valor: number) => String(valor).padStart(DIGITOS_MINIMOS, '0')
  return {
    dias: rellenar(Math.floor(total / SEGUNDOS_POR_DIA)),
    horas: rellenar(Math.floor((total % SEGUNDOS_POR_DIA) / SEGUNDOS_POR_HORA)),
    minutos: rellenar(Math.floor((total % SEGUNDOS_POR_HORA) / SEGUNDOS_POR_MINUTO)),
    segundos: rellenar(total % SEGUNDOS_POR_MINUTO),
  }
}

function pintar(raiz: HTMLElement, objetivo: Date): boolean {
  const restante = tiempoRestante(objetivo, new Date())
  raiz.querySelectorAll<HTMLElement>('[data-unidad]').forEach((celda) => {
    celda.textContent = restante[celda.dataset.unidad as UnidadTiempo]
  })
  return objetivo.getTime() > Date.now()
}

export function iniciarCuentaRegresiva(raiz: HTMLElement): void {
  const objetivo = new Date(raiz.dataset.objetivo ?? '')
  if (Number.isNaN(objetivo.getTime())) return
  const intervalo = window.setInterval(() => {
    if (pintar(raiz, objetivo)) return
    window.clearInterval(intervalo)
    raiz.dataset.estado = 'en-vivo'
  }, MS_POR_SEGUNDO)
  pintar(raiz, objetivo)
}
