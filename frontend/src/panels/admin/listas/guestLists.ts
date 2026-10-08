import type { Inscrito, ListaInvitados } from '@/lib/operacion'
import { formatDateTime, fromDatetimeLocal, toDatetimeLocal } from '@/lib/format'
import type { CsvColumn } from '@/lib/csv'
import { useAdminResource } from '../hooks/useAdminResource'

export const LISTS_PATH = '/admin/lists'
const PUBLIC_LIST_PATH = '/lista/'

export interface ListaInput {
  event_id: string
  nombre: string
  slug?: string
  promoter_id: string | null
  cupo: number | null
  cierra_at: string | null
  activa: boolean
}

/** Valores tal cual los maneja el formulario (inputs de texto). */
export interface ListaFormValues {
  event_id: string
  nombre: string
  slug: string
  promoter_id: string
  cupo: string
  cierra_at: string
  activa: boolean
}

export const EMPTY_LIST_FORM: ListaFormValues = {
  event_id: '', nombre: '', slug: '', promoter_id: '', cupo: '', cierra_at: '', activa: true,
}

export function useGuestLists() {
  return useAdminResource<ListaInvitados, ListaInput>(LISTS_PATH)
}

export function listToForm(lista: ListaInvitados): ListaFormValues {
  return {
    event_id: lista.event_id,
    nombre: lista.nombre,
    slug: lista.slug,
    promoter_id: lista.promoter_id ?? '',
    cupo: lista.cupo === null ? '' : String(lista.cupo),
    cierra_at: toDatetimeLocal(lista.cierra_at),
    activa: lista.activa,
  }
}

/** Slug vacío: el backend lo genera a partir del nombre. */
export function formToInput(values: ListaFormValues): ListaInput {
  return {
    event_id: values.event_id,
    nombre: values.nombre.trim(),
    ...(values.slug.trim() ? { slug: values.slug.trim().toLowerCase() } : {}),
    promoter_id: values.promoter_id || null,
    cupo: values.cupo ? Number(values.cupo) : null,
    cierra_at: fromDatetimeLocal(values.cierra_at),
    activa: values.activa,
  }
}

export function listPublicUrl(slug: string, origin: string = window.location.origin): string {
  return `${origin}${PUBLIC_LIST_PATH}${slug}`
}

export function listShareMessage(lista: ListaInvitados, eventTitle: string): string {
  return `Anótate gratis en la lista "${lista.nombre}" de ${eventTitle} en Skpat VIP: ${listPublicUrl(lista.slug)}`
}

export function capacityLabel(lista: ListaInvitados): string {
  const inscritos = lista.inscritos ?? 0
  return lista.cupo === null ? `${inscritos} inscritos · sin cupo máximo` : `${inscritos} de ${lista.cupo} inscritos`
}

export const INSCRITOS_CSV_COLUMNS: CsvColumn<Inscrito>[] = [
  { header: 'Nombre', value: (inscrito) => inscrito.nombre },
  { header: 'Correo', value: (inscrito) => inscrito.email },
  { header: 'Cédula', value: (inscrito) => inscrito.cedula },
  { header: 'Ingresó', value: (inscrito) => (inscrito.qr_used ? 'Sí' : 'No') },
  { header: 'Inscrito el', value: (inscrito) => formatDateTime(inscrito.created_at) },
]

/** Busca sin distinguir tildes ni mayúsculas en nombre, correo y cédula. */
export function matchesSearch(inscrito: Inscrito, search: string): boolean {
  const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const needle = normalize(search.trim())
  return [inscrito.nombre, inscrito.email, inscrito.cedula].some((field) => normalize(field).includes(needle))
}
