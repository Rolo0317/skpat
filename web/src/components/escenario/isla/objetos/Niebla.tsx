import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, ShaderMaterial, type Color } from 'three'
import { estadoPulso } from '../../pulso'
import { FRAGMENTO_NIEBLA, VERTICE_UV } from '../materiales/shaders'
import type { NombreColor, Paleta } from '../paleta'

interface Capa {
  posicion: [number, number, number]
  tamano: [number, number]
  color: NombreColor
  intensidad: number
  /** 1 = humo pegado al piso; 0 = neblina que llena el aire. */
  bajo: number
}

/** Capas de atrás hacia adelante. Pocas y grandes: el costo está en el relleno, no en la geometría. */
const CAPAS: Capa[] = [
  { posicion: [0, 4.6, -7.6], tamano: [26, 10], color: 'uv', intensidad: 0.5, bajo: 0 },
  { posicion: [0, 5.4, -5.2], tamano: [28, 9], color: 'oro', intensidad: 0.22, bajo: 0 },
  { posicion: [0, 3.6, -2.6], tamano: [30, 8], color: 'azul', intensidad: 0.2, bajo: 0 },
  { posicion: [0, 1.7, -3.3], tamano: [20, 3.4], color: 'champan', intensidad: 0.32, bajo: 1 },
  { posicion: [0, 1.4, 1.5], tamano: [30, 3], color: 'uv', intensidad: 0.3, bajo: 1 },
]

function crearMaterial(color: Color, capa: Capa, indice: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTICE_UV.replace('#include <fog_pars_vertex>', '').replace('#include <fog_vertex>', ''),
    fragmentShader: FRAGMENTO_NIEBLA,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTiempo: { value: 0 },
      uIntensidad: { value: capa.intensidad },
      uColor: { value: color },
      uSemilla: { value: indice * 7.3 },
      uBajo: { value: capa.bajo },
    },
  })
}

export function Niebla({ paleta }: { paleta: Paleta }) {
  const materiales = useMemo(() => CAPAS.map((capa, indice) => crearMaterial(paleta[capa.color], capa, indice)), [paleta])

  useEffect(() => () => materiales.forEach((material) => material.dispose()), [materiales])

  useFrame(({ clock }) => {
    const segundos = clock.elapsedTime
    const pulso = estadoPulso(segundos)
    materiales.forEach((material, indice) => {
      material.uniforms.uTiempo!.value = segundos
      // La neblina se ilumina con el rig: sube con la energía y destella en el drop.
      material.uniforms.uIntensidad!.value = CAPAS[indice]!.intensidad * (0.55 + 0.45 * pulso.energia + 0.8 * pulso.destello)
    })
  })

  return (
    <group>
      {CAPAS.map((capa, indice) => (
        <mesh key={indice} position={capa.posicion} material={materiales[indice]} renderOrder={1}>
          <planeGeometry args={capa.tamano} />
        </mesh>
      ))}
    </group>
  )
}
