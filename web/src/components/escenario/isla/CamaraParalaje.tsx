import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { escucharParalaje, suavizar, type Vector2 } from '../paralaje'
import { estadoPulso } from '../pulso'
import { CAMARA } from './disposicion'

/** Fracción del camino que recorre la cámara por segundo hacia el puntero: lenta, como alguien que se asoma. */
const SUAVIDAD = 0.06
const RESPIRACION = 0.05

/** Cámara a la altura de los ojos del público, con paralaje leve al mover el mouse o inclinar el celular. */
export function CamaraParalaje() {
  const camara = useThree((estado) => estado.camera)
  const entrada = useMemo<Vector2>(() => ({ x: 0, y: 0 }), [])
  const actual = useMemo<Vector2>(() => ({ x: 0, y: 0 }), [])
  const mira = useMemo(() => new Vector3(...CAMARA.mira), [])

  useEffect(() => escucharParalaje(entrada), [entrada])

  useFrame(({ clock }, delta) => {
    actual.x = suavizar(actual.x, entrada.x, SUAVIDAD, delta)
    actual.y = suavizar(actual.y, entrada.y, SUAVIDAD, delta)
    const pulso = estadoPulso(clock.elapsedTime)
    // Respira con la frase: un leve empuje hacia la tarima en el drop.
    const empuje = RESPIRACION * pulso.golpe * pulso.energia
    const [x, y, z] = CAMARA.posicion
    camara.position.set(x + actual.x * CAMARA.paralaje.x, y - actual.y * CAMARA.paralaje.y + empuje * 0.4, z - empuje * 2)
    camara.lookAt(mira.x - actual.x * 0.4, mira.y, mira.z)
  })

  return null
}
