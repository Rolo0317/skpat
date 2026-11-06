import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { Escena } from './Escena'
import { CAMARA } from './disposicion'

const DPR = { maximo: 1.5, minimo: 1 } as const
/** Si un cuadro promedio pasa de esto (≈ 48 fps), se baja la resolución interna. */
const UMBRAL_CUADRO_MS = 21
const CUADROS_DE_MUESTRA = 90
const CUADROS_PARA_LISTO = 3

interface Props {
  /** Se llama cuando ya se pintaron los primeros cuadros: ahí se funde sobre la versión 2.5D. */
  alEstarListo: () => void
}

/** Mide el tiempo de cuadro y avisa si el equipo no llega: el escenario prefiere bajar nitidez a perder fluidez. */
function Vigilante({ alFaltarRendimiento, alEstarListo }: { alFaltarRendimiento: () => void; alEstarListo: () => void }) {
  const muestra = useRef({ cuadros: 0, acumulado: 0, avisoListo: false })
  useFrame((_, delta) => {
    const actual = muestra.current
    actual.cuadros++
    if (!actual.avisoListo && actual.cuadros >= CUADROS_PARA_LISTO) {
      actual.avisoListo = true
      alEstarListo()
    }
    // Se descarta el arranque: los primeros cuadros compilan shaders.
    if (actual.cuadros < 30) return
    actual.acumulado += delta * 1000
    if (actual.cuadros >= 30 + CUADROS_DE_MUESTRA) {
      if (actual.acumulado / CUADROS_DE_MUESTRA > UMBRAL_CUADRO_MS) alFaltarRendimiento()
      actual.cuadros = 30
      actual.acumulado = 0
    }
  })
  return null
}

export default function Lienzo({ alEstarListo }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [activo, setActivo] = useState(true)
  const [dpr, setDpr] = useState<number>(() => Math.min(window.devicePixelRatio || 1, DPR.maximo))

  // Fuera de pantalla o con la pestaña oculta no se pinta ni un cuadro.
  useEffect(() => {
    const nodo = contenedor.current
    if (!nodo) return
    let visible = true
    const actualizar = () => setActivo(visible && !document.hidden)
    const observador = new IntersectionObserver(([entrada]) => {
      visible = Boolean(entrada?.isIntersecting)
      actualizar()
    })
    observador.observe(nodo)
    document.addEventListener('visibilitychange', actualizar)
    return () => {
      observador.disconnect()
      document.removeEventListener('visibilitychange', actualizar)
    }
  }, [])

  return (
    <div ref={contenedor} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        frameloop={activo ? 'always' : 'never'}
        dpr={dpr}
        camera={{ position: [...CAMARA.posicion], fov: CAMARA.fov, near: 0.1, far: 80 }}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.15
          gl.outputColorSpace = SRGBColorSpace
        }}
        aria-hidden="true"
      >
        <Escena />
        <Vigilante alEstarListo={alEstarListo} alFaltarRendimiento={() => setDpr((actual) => Math.max(DPR.minimo, actual - 0.25))} />
      </Canvas>
    </div>
  )
}
