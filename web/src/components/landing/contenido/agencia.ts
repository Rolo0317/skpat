import type { NombreIcono } from '../ui/Icono.astro'

export interface ServicioAgencia {
  icono: NombreIcono
  titulo: string
  texto: string
  puntos: readonly string[]
}

export interface LlamadoAgencia {
  texto: string
  mensajeWhatsapp: string
}

/**
 * Agencia Skpat: representación de DJs y academia. Textos genéricos a propósito: precios, horarios y
 * profesores se informan por WhatsApp para no publicar datos que el negocio no ha confirmado.
 */
export const AGENCIA = {
  titulo: 'Agencia Skpat',
  intro:
    'Además de la pista, Skpat es agencia de DJs: representamos artistas de la casa y formamos a quienes quieren aprender a mezclar.',
  servicios: [
    {
      icono: 'auriculares',
      titulo: 'Booking y representación',
      texto: 'Lleva el sonido Skpat a tu discoteca, evento o fiesta privada con DJs de la agencia.',
      puntos: ['Guaracha y electrónica', 'Propuesta según fecha, lugar y público', 'Coordinación directa por WhatsApp'],
    },
    {
      icono: 'vinilo',
      titulo: 'Cursos y clases de DJ',
      texto: 'Aprende a ser DJ desde cero o sube de nivel con clases prácticas.',
      puntos: ['Para principiantes y DJs en formación', 'Mezcla, manejo de equipos y lectura de pista', 'Horarios y valores por WhatsApp'],
    },
  ] satisfies readonly ServicioAgencia[],
  llamados: {
    aprender: {
      texto: 'Quiero aprender a ser DJ',
      mensajeWhatsapp: 'Hola Skpat VIP, quiero aprender a ser DJ. ¿Me cuentan sobre los cursos y clases (horarios, valores y cupos)?',
    },
    contratar: {
      texto: 'Contratar un DJ',
      mensajeWhatsapp: 'Hola Skpat VIP, quiero contratar un DJ de la agencia. Fecha, lugar y tipo de evento: ',
    },
  } satisfies Record<string, LlamadoAgencia>,
} as const
