import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, ConeGeometry, DoubleSide, MeshStandardMaterial, Quaternion, ShaderMaterial, Vector3, type Color, type Group } from 'three'
import { estadoPulso, type EstadoPulso } from '../../pulso'
import { FRAGMENTO_HAZ, VERTICE_HAZ } from '../materiales/shaders'
import { CABEZALES_X, TRUSS } from '../disposicion'
import type { Paleta } from '../paleta'

const LARGO_HAZ = 13
const RADIO_HAZ = 1.35
const GROSOR_TRUSS = 0.16
const ABAJO = new Vector3(0, -1, 0)

interface Barrido {
  /** Hacia dónde mira el haz en reposo (punto del piso o del público). */
  base: Vector3
  fase: number
}

/** El haz de cada cabezal apunta a un punto que se mueve según la sección de la frase. */
function objetivoDe({ base, fase }: Barrido, segundos: number, pulso: EstadoPulso, destino: Vector3): Vector3 {
  const enDrop = pulso.energia >= 1
  const amplitud = enDrop ? 4.2 : 1.6 + 2 * pulso.subida
  const velocidad = enDrop ? 0.9 : 0.35
  const converger = pulso.subida * 0.85
  destino.set(
    base.x * (1 - converger) + Math.sin(segundos * velocidad + fase) * amplitud,
    base.y,
    base.z + Math.cos(segundos * velocidad * 0.7 + fase * 1.3) * (enDrop ? 3 : 1.2),
  )
  return destino
}

function crearHaz(color: Color): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTICE_HAZ,
    fragmentShader: FRAGMENTO_HAZ,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: { uColor: { value: color }, uIntensidad: { value: 0.5 }, uTiempo: { value: 0 } },
  })
}

/** Truss colgado con cabezales móviles y sus haces volumétricos. */
export function Rig({ paleta }: { paleta: Paleta }) {
  const geometriaHaz = useMemo(() => new ConeGeometry(RADIO_HAZ, LARGO_HAZ, 40, 1, true).translate(0, -LARGO_HAZ / 2, 0), [])
  const haces = useMemo(
    () => CABEZALES_X.map((_, indice) => crearHaz([paleta.oro, paleta.champan, paleta.azul][indice % 3]!)),
    [paleta],
  )
  const lentes = useMemo(() => new MeshStandardMaterial({ color: '#000', emissive: paleta.champan, emissiveIntensity: 3 }), [paleta])
  const barridos = useMemo<Barrido[]>(
    () => CABEZALES_X.map((x, indice) => ({ base: new Vector3(x * 0.8, 0, 1.5 - (indice % 2) * 2.5), fase: indice * 1.1 })),
    [],
  )
  const cabezales = useRef<(Group | null)[]>([])
  const temporal = useMemo(() => ({ objetivo: new Vector3(), direccion: new Vector3(), giro: new Quaternion() }), [])

  useEffect(
    () => () => {
      geometriaHaz.dispose()
      haces.forEach((haz) => haz.dispose())
      lentes.dispose()
    },
    [geometriaHaz, haces, lentes],
  )

  useFrame(({ clock }) => {
    const segundos = clock.elapsedTime
    const pulso = estadoPulso(segundos)
    const intensidad = 0.22 + 0.55 * pulso.energia * (0.55 + 0.45 * pulso.golpe) + 0.5 * pulso.destello
    lentes.emissiveIntensity = 1 + 4 * intensidad
    cabezales.current.forEach((cabezal, indice) => {
      if (!cabezal) return
      objetivoDe(barridos[indice]!, segundos, pulso, temporal.objetivo)
      temporal.direccion.copy(temporal.objetivo).sub(cabezal.position).normalize()
      temporal.giro.setFromUnitVectors(ABAJO, temporal.direccion)
      cabezal.quaternion.slerp(temporal.giro, 0.18)
      const haz = haces[indice]!
      // En el valle se apagan cabezales alternos: el rig respira con la frase.
      const apagado = pulso.energia < 1 && pulso.subida === 0 && indice % 2 === 1
      haz.uniforms.uIntensidad!.value = apagado ? 0.04 : intensidad
      haz.uniforms.uTiempo!.value = segundos
    })
  })

  return (
    <group>
      {/* Truss: dos largueros y bajantes */}
      {[0, 0.55].map((dy) => (
        <mesh key={dy} position={[0, TRUSS.y + dy, TRUSS.z]}>
          <boxGeometry args={[TRUSS.ancho, GROSOR_TRUSS, GROSOR_TRUSS]} />
          <meshStandardMaterial color="#121016" roughness={0.5} metalness={0.8} />
        </mesh>
      ))}
      {[-TRUSS.ancho / 2, TRUSS.ancho / 2].map((x) => (
        <mesh key={x} position={[x, TRUSS.y / 2, TRUSS.z]}>
          <boxGeometry args={[GROSOR_TRUSS * 1.6, TRUSS.y + 0.6, GROSOR_TRUSS * 1.6]} />
          <meshStandardMaterial color="#121016" roughness={0.5} metalness={0.8} />
        </mesh>
      ))}
      {CABEZALES_X.map((x, indice) => (
        <group key={x} position={[x, TRUSS.y - 0.25, TRUSS.z]} ref={(grupo) => void (cabezales.current[indice] = grupo)}>
          <mesh>
            <cylinderGeometry args={[0.2, 0.26, 0.42, 16]} />
            <meshStandardMaterial color="#0c0b10" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[0, -0.22, 0]} rotation={[Math.PI / 2, 0, 0]} material={lentes}>
            <circleGeometry args={[0.17, 20]} />
          </mesh>
          <mesh geometry={geometriaHaz} material={haces[indice]} position={[0, -0.2, 0]} />
        </group>
      ))}
    </group>
  )
}
