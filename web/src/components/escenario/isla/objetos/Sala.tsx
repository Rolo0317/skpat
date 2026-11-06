import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { PointLight } from 'three'
import { estadoPulso } from '../../pulso'
import { CABINA, SALA } from '../disposicion'
import type { Paleta } from '../paleta'

/** Intensidades en candelas (luces físicas de three). */
const LUZ_CABINA = { base: 18, golpe: 70 } as const
const LUZ_LATERAL = { base: 30, golpe: 40 } as const

/** Piso pulido que recoge el color del rig, y las luces que pulsan con el bombo. */
export function Sala({ paleta }: { paleta: Paleta }) {
  const cabina = useRef<PointLight>(null)
  const laterales = useRef<(PointLight | null)[]>([])

  useFrame(({ clock }) => {
    const pulso = estadoPulso(clock.elapsedTime)
    if (cabina.current) cabina.current.intensity = LUZ_CABINA.base + LUZ_CABINA.golpe * pulso.golpe * pulso.energia + 120 * pulso.destello
    laterales.current.forEach((luz, indice) => {
      if (!luz) return
      const alterna = (Math.floor(pulso.tiempos) + indice) % 2 === 0 ? 1 : 0.35
      luz.intensity = (LUZ_LATERAL.base + LUZ_LATERAL.golpe * pulso.golpe) * alterna * (0.5 + 0.5 * pulso.energia)
    })
  })

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial color="#0b0a0f" roughness={0.22} metalness={0.55} />
      </mesh>
      <ambientLight intensity={0.06} />
      <pointLight ref={cabina} color={paleta.oro} position={[0, SALA.alturaTarima + 1.6, CABINA.z + 1.6]} distance={22} decay={2} />
      {[-7, 7].map((x, indice) => (
        <pointLight
          key={x}
          ref={(luz) => void (laterales.current[indice] = luz)}
          color={paleta.azul}
          position={[x, 3.2, -3.5]}
          distance={24}
          decay={2}
        />
      ))}
      <pointLight color={paleta.uv} position={[0, 5, 3]} intensity={14} distance={20} decay={2} />
    </group>
  )
}
