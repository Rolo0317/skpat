import type { EstadoUbicacion, TipoUbicacion } from '~/lib/data'

/** Nombres públicos de cada tipo de ubicación (como en el flyer). */
export const NOMBRE_OFERTA: Record<TipoUbicacion, string> = { palco: 'Palco VIP', mesa: 'Mesa VIP' }
export const NOMBRE_PUESTO: Record<TipoUbicacion, string> = { palco: 'Palco', mesa: 'Mesa' }

export const ESTADOS_UBICACION: Record<EstadoUbicacion, { rotulo: string; descripcion: string }> = {
  disponible: { rotulo: 'Disponible', descripcion: 'disponible, toca para reservar' },
  reservado: { rotulo: 'Reservado', descripcion: 'reservado, pendiente de pago' },
  vendido: { rotulo: 'Vendido', descripcion: 'vendido' },
}

/** Puesto cuyo tipo aún no tiene precio publicado para la fecha. */
export const SIN_PRECIO = 'precio por confirmar, pregúntale a un gestor'
