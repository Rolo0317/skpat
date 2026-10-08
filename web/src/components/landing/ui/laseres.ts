/**
 * Show de láseres y ecualizador en canvas 2D, sincronizado a un pulso de 128 BPM.
 * Se pausa fuera de pantalla o con la pestaña oculta y respeta prefers-reduced-motion.
 */
const BPM = 128
const SEGUNDOS_POR_MINUTO = 60
const SEGUNDOS_POR_PULSO = SEGUNDOS_POR_MINUTO / BPM
const CAIDA_DEL_BOMBO = 5
const DPR_MAXIMO = 2
const MS_POR_SEGUNDO = 1000
const INSTANTE_ESTATICO_S = 1.7

const RAYOS_POR_EMISOR = 6
const APERTURA_ABANICO = 0.9
const AMPLITUD_BARRIDO = 0.35
const VELOCIDAD_BARRIDO = 0.45
const ANCHO_BARRA_PX = 14
const SEPARACION_BARRA_PX = 6
const ALTURA_MAX_EQ = 0.22
const TOKENS_DE_COLOR = ['--color-skpat-oro', '--color-skpat-champan', '--color-skpat-azul'] as const
const HALO = { alfa: 0.12, grosor: 9 } as const
const NUCLEO = { alfa: 0.85, grosor: 1.25 } as const
const INTENSIDAD_BASE = 0.45
const ALFA_ECUALIZADOR = 0.35

interface Emisor {
  x: number
  y: number
  angulo: number
  fase: number
}

interface Escena {
  contexto: CanvasRenderingContext2D
  ancho: number
  alto: number
  tonos: string[]
}

/** Los colores salen de los tokens CSS compartidos con el frontend. */
function leerTonos(): string[] {
  const estilos = getComputedStyle(document.documentElement)
  return TOKENS_DE_COLOR.map((token) => estilos.getPropertyValue(token).trim())
}

function pulso(segundos: number): number {
  const faseDelPulso = (segundos % SEGUNDOS_POR_PULSO) / SEGUNDOS_POR_PULSO
  return Math.exp(-CAIDA_DEL_BOMBO * faseDelPulso)
}

function emisores(ancho: number, alto: number): Emisor[] {
  return [
    { x: ancho * 0.5, y: -alto * 0.04, angulo: Math.PI / 2, fase: 0 },
    { x: -ancho * 0.05, y: alto * 0.12, angulo: Math.PI / 4, fase: 2 },
    { x: ancho * 1.05, y: alto * 0.12, angulo: (3 * Math.PI) / 4, fase: 4 },
  ]
}

function dibujarRayo(escena: Escena, emisor: Emisor, angulo: number, color: string, intensidad: number): void {
  const { contexto, ancho, alto } = escena
  const largo = Math.hypot(ancho, alto)
  const finX = emisor.x + Math.cos(angulo) * largo
  const finY = emisor.y + Math.sin(angulo) * largo
  const degradado = contexto.createLinearGradient(emisor.x, emisor.y, finX, finY)
  degradado.addColorStop(0, color)
  degradado.addColorStop(1, 'transparent')
  contexto.strokeStyle = degradado
  contexto.beginPath()
  contexto.moveTo(emisor.x, emisor.y)
  contexto.lineTo(finX, finY)
  for (const capa of [HALO, NUCLEO]) {
    contexto.globalAlpha = capa.alfa * intensidad
    contexto.lineWidth = capa.grosor
    contexto.stroke()
  }
}

function dibujarAbanico(escena: Escena, emisor: Emisor, segundos: number, bombo: number): void {
  const barrido = Math.sin(segundos * VELOCIDAD_BARRIDO + emisor.fase) * AMPLITUD_BARRIDO
  for (let i = 0; i < RAYOS_POR_EMISOR; i++) {
    const reparto = i / (RAYOS_POR_EMISOR - 1) - 0.5
    const angulo = emisor.angulo + barrido + reparto * APERTURA_ABANICO
    const { tonos } = escena
    const color = tonos[(i + Math.floor(segundos / SEGUNDOS_POR_PULSO)) % tonos.length]!
    dibujarRayo(escena, emisor, angulo, color, INTENSIDAD_BASE + (1 - INTENSIDAD_BASE) * bombo)
  }
}

function alturaDeBarra(indice: number, segundos: number, bombo: number): number {
  const ondas = Math.sin(indice * 0.7 + segundos * 3.1) + Math.sin(indice * 0.23 - segundos * 1.7)
  return 0.25 + 0.35 * (ondas + 2) / 4 + 0.4 * bombo * Math.abs(Math.sin(indice * 1.3))
}

function dibujarEcualizador(escena: Escena, segundos: number, bombo: number): void {
  const { contexto, ancho, alto, tonos } = escena
  const paso = ANCHO_BARRA_PX + SEPARACION_BARRA_PX
  const barras = Math.ceil(ancho / paso)
  const degradado = contexto.createLinearGradient(0, alto, 0, alto * (1 - ALTURA_MAX_EQ))
  degradado.addColorStop(0, tonos[0]!)
  degradado.addColorStop(1, tonos[1]!)
  contexto.fillStyle = degradado
  contexto.globalAlpha = ALFA_ECUALIZADOR
  for (let i = 0; i < barras; i++) {
    const altura = alturaDeBarra(i, segundos, bombo) * alto * ALTURA_MAX_EQ
    contexto.fillRect(i * paso, alto - altura, ANCHO_BARRA_PX, altura)
  }
}

function dibujarCuadro(escena: Escena, segundos: number): void {
  const { contexto, ancho, alto } = escena
  const bombo = pulso(segundos)
  contexto.globalCompositeOperation = 'source-over'
  contexto.clearRect(0, 0, ancho, alto)
  contexto.globalCompositeOperation = 'lighter'
  for (const emisor of emisores(ancho, alto)) dibujarAbanico(escena, emisor, segundos, bombo)
  dibujarEcualizador(escena, segundos, bombo)
  contexto.globalAlpha = 1
}

function ajustarTamano(lienzo: HTMLCanvasElement, contexto: CanvasRenderingContext2D): Escena {
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAXIMO)
  const { width, height } = lienzo.getBoundingClientRect()
  lienzo.width = Math.round(width * dpr)
  lienzo.height = Math.round(height * dpr)
  contexto.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { contexto, ancho: width, alto: height, tonos: leerTonos() }
}

export function iniciarLaseres(lienzo: HTMLCanvasElement): void {
  const contexto = lienzo.getContext('2d')
  if (!contexto) return
  const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)')
  let escena = ajustarTamano(lienzo, contexto)
  let visible = true
  let cuadro = 0

  const animar = (instante: number) => {
    dibujarCuadro(escena, instante / MS_POR_SEGUNDO)
    cuadro = requestAnimationFrame(animar)
  }
  const detener = () => cancelAnimationFrame(cuadro)
  const reanudar = () => {
    detener()
    if (movimientoReducido.matches) return dibujarCuadro(escena, INSTANTE_ESTATICO_S)
    if (visible && !document.hidden) cuadro = requestAnimationFrame(animar)
  }

  new ResizeObserver(() => {
    escena = ajustarTamano(lienzo, contexto)
    reanudar()
  }).observe(lienzo)
  new IntersectionObserver(([entrada]) => {
    visible = Boolean(entrada?.isIntersecting)
    reanudar()
  }).observe(lienzo)
  document.addEventListener('visibilitychange', reanudar)
  movimientoReducido.addEventListener('change', reanudar)
}
