import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshStandardMaterial, type Group, type Mesh } from 'three'
import { estadoPulso } from '../../pulso'
import { CABINA, SALA } from '../disposicion'
import type { Paleta } from '../paleta'

const NEGRO = '#050407'
const METAL = '#17141c'
/** Cuánto baja la cabeza del DJ con cada golpe. */
const CABECEO = 0.045
/** Radianes que gira el brazo del DJ desde colgado hasta arriba en el drop. */
const BRAZO_ARRIBA = 2.5
const BRAZO_REPOSO = 0.25

/** Tarima, cabina con franja LED, equipos y la silueta del DJ que marca el tiempo. */
export function Cabina({ paleta }: { paleta: Paleta }) {
  const franja = useMemo(
    () => new MeshStandardMaterial({ color: '#000', emissive: paleta.oro, emissiveIntensity: 2 }),
    [paleta],
  )
  const pantallitas = useMemo(
    () => new MeshStandardMaterial({ color: '#000', emissive: paleta.azul, emissiveIntensity: 1.2 }),
    [paleta],
  )
  const cabeza = useRef<Mesh>(null)
  const brazo = useRef<Group>(null)

  useFrame(({ clock }) => {
    const pulso = estadoPulso(clock.elapsedTime)
    franja.emissiveIntensity = 0.8 + 2.6 * pulso.golpe * pulso.energia + 3 * pulso.destello
    pantallitas.emissiveIntensity = 0.7 + 0.6 * pulso.golpe
    if (cabeza.current) cabeza.current.position.y = 2.1 - CABECEO * pulso.golpe
    if (brazo.current) {
      const arriba = pulso.compas < 2 ? 1 : pulso.subida
      brazo.current.rotation.z = BRAZO_REPOSO + arriba * BRAZO_ARRIBA * (0.9 + 0.1 * pulso.golpe)
    }
  })

  const baseCabina = SALA.alturaTarima
  return (
    <group>
      {/* Tarima */}
      <mesh position={[0, SALA.alturaTarima / 2, (SALA.frenteTarima + SALA.fondoTarima) / 2]}>
        <boxGeometry args={[SALA.anchoTarima, SALA.alturaTarima, SALA.frenteTarima - SALA.fondoTarima]} />
        <meshStandardMaterial color={METAL} roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, SALA.alturaTarima - 0.06, SALA.frenteTarima + 0.01]} material={franja}>
        <boxGeometry args={[SALA.anchoTarima, 0.05, 0.02]} />
      </mesh>

      {/* Cabina */}
      <group position={[0, baseCabina, CABINA.z]}>
        <mesh position={[0, CABINA.alto / 2, 0]}>
          <boxGeometry args={[CABINA.ancho, CABINA.alto, CABINA.fondo]} />
          <meshStandardMaterial color={NEGRO} roughness={0.35} metalness={0.7} />
        </mesh>
        <mesh position={[0, CABINA.alto * 0.62, CABINA.fondo / 2 + 0.005]} material={franja}>
          <boxGeometry args={[CABINA.ancho * 0.94, 0.06, 0.01]} />
        </mesh>
        <mesh position={[0, CABINA.alto * 0.3, CABINA.fondo / 2 + 0.005]} material={franja}>
          <boxGeometry args={[CABINA.ancho * 0.6, 0.025, 0.01]} />
        </mesh>
        {/* Reproductores y mezclador */}
        {[-1.05, 0, 1.05].map((x) => (
          <group key={x} position={[x, CABINA.alto + 0.05, -0.05]}>
            <mesh>
              <boxGeometry args={[x === 0 ? 0.7 : 0.85, 0.1, 0.75]} />
              <meshStandardMaterial color={METAL} roughness={0.4} metalness={0.6} />
            </mesh>
            <mesh position={[0, 0.06, -0.2]} rotation={[-0.5, 0, 0]} material={pantallitas}>
              <planeGeometry args={[x === 0 ? 0.4 : 0.32, 0.18]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* DJ: silueta negra contra la pantalla */}
      <group position={[0.2, baseCabina, CABINA.z - 1.05]}>
        <mesh position={[0, 1.35, 0]}>
          <capsuleGeometry args={[0.27, 0.95, 4, 12]} />
          <meshBasicMaterial color={NEGRO} />
        </mesh>
        <mesh ref={cabeza} position={[0, 2.1, 0.02]}>
          <sphereGeometry args={[0.15, 16, 12]} />
          <meshBasicMaterial color={NEGRO} />
        </mesh>
        <mesh position={[0, 2.16, 0.02]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.17, 0.025, 6, 16, Math.PI]} />
          <meshBasicMaterial color={NEGRO} />
        </mesh>
        <group ref={brazo} position={[0.27, 1.78, 0.05]}>
          <mesh position={[0, -0.36, 0]}>
            <capsuleGeometry args={[0.06, 0.62, 4, 8]} />
            <meshBasicMaterial color={NEGRO} />
          </mesh>
        </group>
        <mesh position={[-0.32, 1.58, 0.25]} rotation={[0.9, 0, 0.35]}>
          <capsuleGeometry args={[0.06, 0.55, 4, 8]} />
          <meshBasicMaterial color={NEGRO} />
        </mesh>
      </group>
    </group>
  )
}
