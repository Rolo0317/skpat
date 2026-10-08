import type { ListaPublica } from '~/lib/data'

export type EstadoLista = 'abierta' | 'llena' | 'cerrada'

export function estadoDeLista(lista: ListaPublica, ahora: Date): EstadoLista {
  if (lista.cupo !== null && lista.inscritos >= lista.cupo) return 'llena'
  const vencida = lista.cierraEn !== null && lista.cierraEn.getTime() <= ahora.getTime()
  return lista.abierta && !vencida ? 'abierta' : 'cerrada'
}

export function textoDeCupo(lista: ListaPublica): string {
  if (lista.cupo === null) return `${lista.inscritos} inscritos`
  const quedan = Math.max(0, lista.cupo - lista.inscritos)
  return `Quedan ${quedan} de ${lista.cupo} cupos`
}

export const MENSAJES_LISTA: Record<EstadoLista, { titulo: string; texto: string }> = {
  abierta: { titulo: 'Anótate gratis', texto: 'Llena tus datos y recibe tu QR al instante. Es personal: uno por persona.' },
  llena: { titulo: 'Lista llena', texto: 'Se acabaron los cupos de esta lista. Escríbele al gestor para otras opciones de entrada.' },
  cerrada: { titulo: 'Lista cerrada', texto: 'Esta lista ya no recibe inscripciones. Escríbele al gestor para otras opciones de entrada.' },
}
