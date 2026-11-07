import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, DataTexture, LinearFilter, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, type Texture } from 'three'
import { estadoPulso } from '../../pulso'
import { FRAGMENTO_LED, VERTICE_UV } from '../materiales/shaders'
import { PANTALLA } from '../disposicion'
import type { Paleta } from '../paleta'

const MARCA = 'SKPAT'
const FUENTE = '"Unbounded Variable", "Arial Black", sans-serif'
const LIENZO = { ancho: 1024, alto: 436 } as const
/** Píxeles LED de la pantalla central: suficientes para leer la marca sin perder el grano. */
const PIXELES_CENTRAL = new Vector2(176, 75)
const PIXELES_COLUMNA = new Vector2(14, 64)
const COLUMNAS_X = [-9.4, 9.4] as const
const COLUMNA = { ancho: 1.6, alto: 6.8 } as const

/** Marca pintada en un canvas: es la única "textura" del escenario y no pesa nada en la red. */
function pintarMarca(): CanvasTexture {
  const lienzo = document.createElement('canvas')
  lienzo.width = LIENZO.ancho
  lienzo.height = LIENZO.alto
  const textura = new CanvasTexture(lienzo)
  textura.minFilter = LinearFilter
  const dibujar = () => {
    const contexto = lienzo.getContext('2d')
    if (!contexto) return
    contexto.fillStyle = '#000'
    contexto.fillRect(0, 0, LIENZO.ancho, LIENZO.alto)
    contexto.fillStyle = '#fff'
    contexto.textAlign = 'center'
    contexto.textBaseline = 'middle'
    contexto.font = `900 230px ${FUENTE}`
    contexto.fillText(MARCA, LIENZO.ancho / 2, LIENZO.alto * 0.47, LIENZO.ancho * 0.86)
    textura.needsUpdate = true
  }
  dibujar()
  // Si la fuente llega después, se repinta con la letra de la marca.
  void document.fonts?.load(`900 230px ${FUENTE}`).then(dibujar).catch(() => undefined)
  return textura
}

function texturaVacia(): Texture {
  const textura = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
  textura.needsUpdate = true
  return textura
}

function crearMaterial(paleta: Paleta, pixeles: Vector2): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTICE_UV,
    fragmentShader: FRAGMENTO_LED,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTiempo: { value: 0 },
        uGolpe: { value: 0 },
        uEnergia: { value: 1 },
        uDestello: { value: 0 },
        uAvanceFrase: { value: 0 },
        uPixeles: { value: pixeles },
        uOro: { value: paleta.oro },
        uAzul: { value: paleta.azul },
        uChampan: { value: paleta.champan },
        uMarca: { value: null },
      },
    ]),
  })
}

export function PantallaLed({ paleta }: { paleta: Paleta }) {
  const { central, columna, texturas } = useMemo(() => {
    const marca = pintarMarca()
    const vacia = texturaVacia()
    const central = crearMaterial(paleta, PIXELES_CENTRAL)
    const columna = crearMaterial(paleta, PIXELES_COLUMNA)
    // UniformsUtils.merge clona las texturas: se asignan después para conservar la referencia que se repinta.
    central.uniforms.uMarca!.value = marca
    columna.uniforms.uMarca!.value = vacia
    return { central, columna, texturas: [marca, vacia] }
  }, [paleta])

  useEffect(
    () => () => {
      central.dispose()
      columna.dispose()
      texturas.forEach((textura) => textura.dispose())
    },
    [central, columna, texturas],
  )

  useFrame(({ clock }) => {
    const segundos = clock.elapsedTime
    const pulso = estadoPulso(segundos)
    for (const material of [central, columna]) {
      const u = material.uniforms
      u.uTiempo!.value = segundos
      u.uGolpe!.value = pulso.golpe
      u.uEnergia!.value = pulso.energia
      u.uDestello!.value = pulso.destello
      u.uAvanceFrase!.value = pulso.avanceFrase
    }
  })

  return (
    <group>
      <mesh position={[0, PANTALLA.base + PANTALLA.alto / 2, PANTALLA.z]} material={central}>
        <planeGeometry args={[PANTALLA.ancho, PANTALLA.alto]} />
      </mesh>
      {COLUMNAS_X.map((x) => (
        <mesh key={x} position={[x, COLUMNA.alto / 2 + 0.4, PANTALLA.z + 1.2]} rotation={[0, -Math.sign(x) * 0.35, 0]} material={columna}>
          <planeGeometry args={[COLUMNA.ancho, COLUMNA.alto]} />
        </mesh>
      ))}
    </group>
  )
}
