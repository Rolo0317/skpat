import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CylinderGeometry, MeshBasicMaterial, type Group } from 'three'
import { estadoPulso } from '../../pulso'
import { CABINA, SALA } from '../disposicion'
import type { Paleta } from '../paleta'

const RAYOS = 9
const LARGO = 30
const APERTURA = 1.05
const NUCLEO = 0.007
const HALO = 0.045

interface Emisor {
  x: number
  y: number
  z: number
  /** Inclinación hacia arriba, en radianes: los rayos pasan por encima del público. */
  alzado: number
  fase: number
  color: 'azul' | 'champan'
}

const EMISORES: Emisor[] = [
  { x: 0, y: SALA.alturaTarima + CABINA.alto + 0.1, z: CABINA.z + 0.7, alzado: 0.1, fase: 0, color: 'azul' },
  { x: -7.8, y: 7.4, z: -4.4, alzado: -0.22, fase: 1.7, color: 'champan' },
  { x: 7.8, y: 7.4, z: -4.4, alzado: -0.22, fase: 3.4, color: 'champan' },
]

/** Abanicos de láser que barren sobre el público. Se encienden en el drop y en el final de la subida. */
export function Laseres({ paleta }: { paleta: Paleta }) {
  const geometrias = useMemo(
    () => [NUCLEO, HALO].map((radio) => new CylinderGeometry(radio, radio, LARGO, 6, 1, true).translate(0, LARGO / 2, 0)),
    [],
  )
  const materiales = useMemo(
    () =>
      EMISORES.map(({ color }) => ({
        nucleo: new MeshBasicMaterial({ color: paleta[color], transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false }),
        halo: new MeshBasicMaterial({ color: paleta[color], transparent: true, opacity: 0.12, blending: AdditiveBlending, depthWrite: false, fog: false }),
      })),
    [paleta],
  )
  const abanicos = useRef<(Group | null)[]>([])

  useEffect(
    () => () => {
      geometrias.forEach((geometria) => geometria.dispose())
      materiales.forEach(({ nucleo, halo }) => (nucleo.dispose(), halo.dispose()))
    },
    [geometrias, materiales],
  )

  useFrame(({ clock }) => {
    const segundos = clock.elapsedTime
    const pulso = estadoPulso(segundos)
    const encendido = pulso.energia >= 1 ? 1 : Math.max(0, (pulso.subida - 0.6) / 0.4)
    abanicos.current.forEach((abanico, indice) => {
      if (!abanico) return
      const emisor = EMISORES[indice]!
      abanico.visible = encendido > 0.01
      abanico.rotation.y = Math.sin(segundos * 0.6 + emisor.fase) * 0.45
      abanico.rotation.x = Math.PI / 2 - emisor.alzado - Math.sin(segundos * 1.3 + emisor.fase) * 0.06
      const { nucleo, halo } = materiales[indice]!
      // Parpadeo al ritmo: los láseres cortan en contratiempo.
      const corte = pulso.fase > 0.55 && pulso.compas % 2 === 1 ? 0.15 : 1
      nucleo.opacity = encendido * corte * 0.9
      halo.opacity = encendido * corte * (0.08 + 0.1 * pulso.golpe)
    })
  })

  return (
    <group>
      {EMISORES.map((emisor, indice) => (
        <group key={indice} position={[emisor.x, emisor.y, emisor.z]}>
          <group ref={(grupo) => void (abanicos.current[indice] = grupo)}>
            {Array.from({ length: RAYOS }, (_, rayo) => {
              const angulo = (rayo / (RAYOS - 1) - 0.5) * APERTURA + (emisor.x === 0 ? 0 : Math.sign(emisor.x) * 0.5)
              return (
                <group key={rayo} rotation={[0, 0, angulo]}>
                  <mesh geometry={geometrias[0]} material={materiales[indice]!.nucleo} />
                  <mesh geometry={geometrias[1]} material={materiales[indice]!.halo} />
                </group>
              )
            })}
          </group>
        </group>
      ))}
    </group>
  )
}
