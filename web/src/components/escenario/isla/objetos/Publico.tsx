import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleGeometry, InstancedMesh, MeshBasicMaterial, Object3D, SphereGeometry } from 'three'
import { estadoPulso } from '../../pulso'
import { PUBLICO } from '../disposicion'

/** Silueta: casi negro. La niebla de la sala aclara a los de atrás y da la profundidad. */
const COLOR_SILUETA = '#030205'
const SALTO = 0.07
const ALTURA_HOMBROS = 1.38

interface Persona {
  x: number
  z: number
  escala: number
  fase: number
  /** 0 sin brazos arriba, 1 un brazo, 2 los dos. */
  brazos: 0 | 1 | 2
  giro: number
}

/** Generador determinista: el público es el mismo en cada visita y en cada captura. */
function aleatorio(semilla: number): () => number {
  let estado = semilla
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296
    return estado / 4294967296
  }
}

function armarPublico(): Persona[] {
  const azar = aleatorio(2027)
  return Array.from({ length: PUBLICO.cantidad }, () => {
    // Más gente cerca de la tarima: la raíz cuadrada empuja la distribución hacia el fondo.
    const profundidad = Math.sqrt(azar())
    const z = PUBLICO.zCerca - (PUBLICO.zCerca - PUBLICO.zLejos) * profundidad
    const sorteo = azar()
    return {
      x: (azar() - 0.5) * PUBLICO.ancho * (0.55 + 0.45 * profundidad),
      z,
      escala: 0.88 + azar() * 0.22,
      fase: azar(),
      brazos: (sorteo > 0.82 ? 2 : sorteo > 0.6 ? 1 : 0) as 0 | 1 | 2,
      giro: (azar() - 0.5) * 0.6,
    }
  }).filter((persona) => !(persona.z > 4.6 && Math.abs(persona.x) < 1.1))
}

export function Publico() {
  const personas = useMemo(armarPublico, [])
  const brazosTotales = useMemo(() => personas.reduce((total, persona) => total + persona.brazos, 0), [personas])
  const recursos = useMemo(
    () => ({
      material: new MeshBasicMaterial({ color: COLOR_SILUETA }),
      cuerpo: new CapsuleGeometry(0.23, 0.78, 3, 10),
      cabeza: new SphereGeometry(0.13, 12, 10),
      brazo: new CapsuleGeometry(0.055, 0.62, 2, 6).translate(0, 0.36, 0),
      ayudante: new Object3D(),
    }),
    [],
  )
  const cuerpos = useRef<InstancedMesh>(null)
  const cabezas = useRef<InstancedMesh>(null)
  const brazos = useRef<InstancedMesh>(null)

  useEffect(
    () => () => {
      recursos.material.dispose()
      recursos.cuerpo.dispose()
      recursos.cabeza.dispose()
      recursos.brazo.dispose()
    },
    [recursos],
  )

  const colocar = (segundos: number) => {
    const pulso = estadoPulso(segundos)
    const { ayudante } = recursos
    let indiceBrazo = 0
    personas.forEach((persona, indice) => {
      // Cada quien rebota con el bombo, con su propio retraso; en el drop saltan más.
      const retraso = (pulso.fase + persona.fase * 0.35) % 1
      const rebote = Math.exp(-5 * retraso) * SALTO * (0.5 + pulso.energia) * persona.escala
      const vaiven = Math.sin(pulso.tiempos * Math.PI * 0.5 + persona.fase * 6.28) * 0.04
      const y = rebote
      ayudante.position.set(persona.x + vaiven, (0.78 / 2 + 0.23) * persona.escala + y, persona.z)
      ayudante.rotation.set(0, persona.giro, vaiven)
      ayudante.scale.setScalar(persona.escala)
      ayudante.updateMatrix()
      cuerpos.current?.setMatrixAt(indice, ayudante.matrix)

      ayudante.position.set(persona.x + vaiven * 1.6, (ALTURA_HOMBROS + 0.28) * persona.escala + y, persona.z)
      ayudante.updateMatrix()
      cabezas.current?.setMatrixAt(indice, ayudante.matrix)

      const alzados = pulso.energia >= 1 || pulso.subida > 0.5 ? persona.brazos : Math.min(persona.brazos, 1)
      for (let lado = 0; lado < persona.brazos; lado++) {
        const signo = lado === 0 ? 1 : -1
        const arriba = lado < alzados ? 1 : 0
        const angulo = arriba ? signo * (0.25 + 0.15 * Math.sin(pulso.tiempos * Math.PI + persona.fase * 4)) : signo * 2.7
        ayudante.position.set(persona.x + signo * 0.24 * persona.escala + vaiven, ALTURA_HOMBROS * persona.escala + y, persona.z)
        ayudante.rotation.set(0, persona.giro, -angulo)
        ayudante.updateMatrix()
        brazos.current?.setMatrixAt(indiceBrazo++, ayudante.matrix)
      }
    })
    for (const malla of [cuerpos.current, cabezas.current, brazos.current]) if (malla) malla.instanceMatrix.needsUpdate = true
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- solo la primera pose, antes del primer cuadro.
  useLayoutEffect(() => colocar(0), [])
  useFrame(({ clock }) => colocar(clock.elapsedTime))

  return (
    <group>
      <instancedMesh ref={cuerpos} args={[recursos.cuerpo, recursos.material, personas.length]} frustumCulled={false} />
      <instancedMesh ref={cabezas} args={[recursos.cabeza, recursos.material, personas.length]} frustumCulled={false} />
      <instancedMesh ref={brazos} args={[recursos.brazo, recursos.material, Math.max(1, brazosTotales)]} frustumCulled={false} />
    </group>
  )
}
