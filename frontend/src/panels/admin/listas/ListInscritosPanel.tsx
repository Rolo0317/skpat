import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiErrors'
import { toCsv } from '@/lib/csv'
import { downloadCsv } from '@/lib/download'
import { formatDateTime } from '@/lib/format'
import type { Inscrito, InscritosLista, ListaInvitados } from '@/lib/operacion'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { cardClass, inputClass } from '@/components/ui/styles'
import { INSCRITOS_CSV_COLUMNS, LISTS_PATH, matchesSearch } from './guestLists'

const COLUMNS: Column<Inscrito>[] = [
  { header: 'Nombre', cell: (inscrito) => <span className="font-semibold text-skpat-white">{inscrito.nombre}</span> },
  { header: 'Correo', cell: (inscrito) => inscrito.email },
  { header: 'Cédula', cell: (inscrito) => inscrito.cedula },
  { header: 'Ingresó', cell: (inscrito) => (inscrito.qr_used ? 'Sí' : 'No') },
  { header: 'Inscrito el', cell: (inscrito) => formatDateTime(inscrito.created_at) },
]

export function ListInscritosPanel({ lista, onClose }: { lista: ListaInvitados; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const path = `${LISTS_PATH}/${lista.id}/inscritos`
  const { data, isLoading, error } = useQuery({ queryKey: [path], queryFn: () => api.get<InscritosLista>(path) })
  const inscritos = data?.inscritos ?? []
  const visible = search ? inscritos.filter((inscrito) => matchesSearch(inscrito, search)) : inscritos

  const exportCsv = () => downloadCsv(`lista-${lista.slug}.csv`, toCsv(visible, INSCRITOS_CSV_COLUMNS))

  return (
    <section className={`${cardClass} mt-6`} aria-label={`Inscritos de ${lista.nombre}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-skpat-white">Inscritos · {lista.nombre} <span className="text-skpat-muted">({inscritos.length})</span></h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv} disabled={visible.length === 0}>
            <Download size={14} aria-hidden="true" /> Exportar CSV
          </Button>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
      <label className="relative mb-4 block">
        <span className="sr-only">Buscar inscrito</span>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-skpat-muted" aria-hidden="true" />
        <input className={`${inputClass} pl-9`} type="search" placeholder="Buscar por nombre, correo o cédula" value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      {error && <Alert>{apiErrorMessage(error)}</Alert>}
      {isLoading ? <p className="text-skpat-muted">Cargando…</p> : (
        <DataTable caption={`Inscritos de ${lista.nombre}`} rows={visible} columns={COLUMNS} rowKey={(inscrito) => inscrito.email}
          emptyMessage={search ? 'Nadie coincide con la búsqueda.' : 'Aún no hay inscritos.'} />
      )}
    </section>
  )
}
