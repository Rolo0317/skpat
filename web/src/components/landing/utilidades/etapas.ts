import type { EventoPublico, OfertaEvento, PrecioVigente } from '~/lib/data'

export type EstadoEtapa = 'vencida' | 'vigente' | 'proxima'

/** Etapa lista para pintar; precioCentavos null = "por confirmar" (taquilla sin precio). */
export interface EtapaVisible {
  id: string
  nombre: string
  precioCentavos: number | null
  terminaEn: Date | null
  estado: EstadoEtapa
  esTaquilla: boolean
}

const ID_TAQUILLA = 'taquilla'

const sigueAbierta = (terminaEn: Date | null, ahora: Date) => terminaEn === null || terminaEn.getTime() > ahora.getTime()

/**
 * Regla 4 del contrato: vigente es la primera etapa (por orden) sin vencer; si no queda ninguna, aplica la
 * taquilla (events.price). La taquilla siempre se muestra al final, con "por confirmar" si su precio es 0.
 */
export function armarEtapas(oferta: OfertaEvento, evento: EventoPublico, ahora: Date): EtapaVisible[] {
  const indiceVigente = oferta.etapas.findIndex((etapa) => sigueAbierta(etapa.terminaEn, ahora))
  const etapas = oferta.etapas.map<EtapaVisible>((etapa, indice) => ({
    id: etapa.id,
    nombre: etapa.nombre,
    precioCentavos: etapa.precioCentavos,
    terminaEn: etapa.terminaEn,
    estado: indiceVigente === -1 || indice < indiceVigente ? 'vencida' : indice === indiceVigente ? 'vigente' : 'proxima',
    esTaquilla: false,
  }))
  const taquilla: EtapaVisible = {
    id: ID_TAQUILLA,
    nombre: 'Taquilla',
    precioCentavos: evento.precioCentavos > 0 ? evento.precioCentavos : null,
    terminaEn: null,
    estado: indiceVigente === -1 ? 'vigente' : 'proxima',
    esTaquilla: true,
  }
  return [...etapas, taquilla]
}

export const etapaVigente = (etapas: EtapaVisible[]): EtapaVisible | undefined =>
  etapas.find((etapa) => etapa.estado === 'vigente')

/** La taquilla en 0 significa que aún no tiene precio: se muestra "por confirmar" (null). */
export function centavosPublicados(precio: PrecioVigente): number | null {
  return precio.esTaquilla && precio.precioCentavos === 0 ? null : precio.precioCentavos
}
