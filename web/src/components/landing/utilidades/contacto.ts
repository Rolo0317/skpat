import type { AjustesLugar } from '~/lib/data'
import { NEGOCIO } from '../contenido/negocio'
import { enlaceWhatsapp } from './whatsapp'

/** Persona que atiende por WhatsApp (un gestor o, si no hay ninguno activo, la línea del negocio). */
export interface ContactoWhatsapp {
  nombre: string
  whatsapp: string
}

const LINEA_DEL_NEGOCIO: ContactoWhatsapp = { nombre: NEGOCIO.nombre, whatsapp: NEGOCIO.telefono.internacional }

export const SECTOR = `Sector ${NEGOCIO.direccion.sector}`
const DIRECCION_PENDIENTE = `${SECTOR} · dirección exacta por WhatsApp`

export function contactosWhatsapp(ajustes: AjustesLugar): ContactoWhatsapp[] {
  return ajustes.gestores.length > 0 ? ajustes.gestores : [LINEA_DEL_NEGOCIO]
}

/** Enlace al primer gestor activo con el mensaje dado. */
export function whatsappPrincipal(ajustes: AjustesLugar, mensaje: string): string {
  const [principal = LINEA_DEL_NEGOCIO] = contactosWhatsapp(ajustes)
  return enlaceWhatsapp(principal.whatsapp, mensaje)
}

/** Dirección para mostrar: la que define el admin o el sector con la invitación a pedirla por WhatsApp. */
export function textoDireccion(ajustes: AjustesLugar): string {
  return ajustes.direccion ?? DIRECCION_PENDIENTE
}

export function enlacesMapa(ajustes: AjustesLugar) {
  const consulta = encodeURIComponent(`${ajustes.direccion ?? NEGOCIO.direccion.sector}, ${NEGOCIO.direccion.ciudad}, Colombia`)
  return {
    google: ajustes.mapaUrl ?? `https://www.google.com/maps/search/?api=1&query=${consulta}`,
    waze: `https://waze.com/ul?q=${consulta}&navigate=yes`,
  }
}
