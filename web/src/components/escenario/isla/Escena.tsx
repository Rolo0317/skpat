import { useMemo } from 'react'
import { leerPaleta } from './paleta'
import { CamaraParalaje } from './CamaraParalaje'
import { Sala } from './objetos/Sala'
import { PantallaLed } from './objetos/PantallaLed'
import { Cabina } from './objetos/Cabina'
import { Rig } from './objetos/Rig'
import { Laseres } from './objetos/Laseres'
import { Niebla } from './objetos/Niebla'
import { Publico } from './objetos/Publico'

const DENSIDAD_NIEBLA = 0.05

/** Composición del escenario. Cada objeto es independiente y lee el pulso por su cuenta. */
export function Escena() {
  const paleta = useMemo(leerPaleta, [])

  return (
    <>
      <color attach="background" args={[paleta.sala]} />
      <fogExp2 attach="fog" args={[paleta.sala.getHex(), DENSIDAD_NIEBLA]} />
      <CamaraParalaje />
      <Sala paleta={paleta} />
      <PantallaLed paleta={paleta} />
      <Cabina paleta={paleta} />
      <Rig paleta={paleta} />
      <Laseres paleta={paleta} />
      <Publico />
      <Niebla paleta={paleta} />
    </>
  )
}
