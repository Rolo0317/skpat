import { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import type { ListaInvitados } from '@/lib/operacion'
import { formatDateTime } from '@/lib/format'
import { whatsappShareUrl } from '@/lib/whatsapp'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/ui/CopyButton'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import { ConfirmDeleteButton } from '@/components/ui/ConfirmDeleteButton'
import { cardClass } from '@/components/ui/styles'
import { EventSelect } from '../components/EntitySelects'
import { useEvents } from '@/features/events/queries'
import { usePromoters } from '../hooks/usePromoters'
import { GuestListForm } from './GuestListForm'
import { ListInscritosPanel } from './ListInscritosPanel'
import { capacityLabel, listPublicUrl, listShareMessage, listToForm, useGuestLists } from './guestLists'

type Editor = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; lista: ListaInvitados }

export default function AdminListsPage() {
  const { items, isLoading, create, update, remove } = useGuestLists()
  const { events } = useEvents()
  const { items: gestores } = usePromoters()
  const [eventFilter, setEventFilter] = useState('')
  const [editor, setEditor] = useState<Editor>({ mode: 'closed' })
  const [inscritosOf, setInscritosOf] = useState<ListaInvitados | null>(null)

  const eventTitle = (eventId: string) => events.find((event) => event.id === eventId)?.title ?? 'Evento'
  const gestorName = (promoterId: string | null) => gestores.find((gestor) => gestor.id === promoterId)?.nombre
  const visible = eventFilter ? items.filter((lista) => lista.event_id === eventFilter) : items
  const closeEditor = () => setEditor({ mode: 'closed' })

  return (
    <section className="mx-auto max-w-6xl p-4 sm:p-6">
      <PageHeader
        title="Listas"
        description="Registro gratis con QR propio. Comparte el enlace de cada lista por WhatsApp."
        actions={editor.mode === 'closed' && <Button onClick={() => setEditor({ mode: 'create' })}><Plus size={16} aria-hidden="true" /> Nueva lista</Button>}
      />

      {editor.mode === 'create' && (
        <div className="mb-6">
          <GuestListForm submitLabel="Crear lista" onSubmit={async (input) => { await create.mutateAsync(input); closeEditor() }} onCancel={closeEditor} />
        </div>
      )}

      <div className="mb-4 max-w-sm">
        <EventSelect label="Filtrar por evento" value={eventFilter} onChange={setEventFilter} emptyLabel="Todos los eventos" />
      </div>

      {isLoading && <p className="text-skpat-muted">Cargando…</p>}
      {!isLoading && visible.length === 0 && <p className="py-6 text-center text-sm text-skpat-muted">No hay listas para este filtro.</p>}

      <ul className="grid gap-4 md:grid-cols-2">
        {visible.map((lista) => (
          <li key={lista.id} className={cardClass}>
            {editor.mode === 'edit' && editor.lista.id === lista.id ? (
              <GuestListForm key={lista.id} initial={listToForm(lista)} submitLabel="Guardar cambios" onCancel={closeEditor}
                onSubmit={async (changes) => { await update.mutateAsync({ id: lista.id, changes }); closeEditor() }} />
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-skpat-white">{lista.nombre}</h2>
                    <p className="text-xs text-skpat-muted">{eventTitle(lista.event_id)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${lista.activa ? 'bg-skpat-oro text-skpat-bg' : 'bg-white/10 text-skpat-muted'}`}>
                    {lista.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-skpat-muted">Gestor</dt><dd>{gestorName(lista.promoter_id) ?? 'Automático'}</dd>
                  <dt className="text-skpat-muted">Cupo</dt><dd>{capacityLabel(lista)}</dd>
                  <dt className="text-skpat-muted">Cierra</dt><dd>{lista.cierra_at ? formatDateTime(lista.cierra_at) : 'Sin fecha de cierre'}</dd>
                  <dt className="text-skpat-muted">Enlace</dt><dd className="break-all text-skpat-champan">{listPublicUrl(lista.slug)}</dd>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <CopyButton text={listPublicUrl(lista.slug)} label={`Copiar enlace de ${lista.nombre}`} />
                  <WhatsAppLink href={whatsappShareUrl(listShareMessage(lista, eventTitle(lista.event_id)))} label="Compartir" />
                  <Button variant="secondary" onClick={() => setInscritosOf(lista)}><Users size={14} aria-hidden="true" /> Inscritos</Button>
                  <Button variant="ghost" onClick={() => setEditor({ mode: 'edit', lista })}>Editar</Button>
                  <ConfirmDeleteButton itemName={`la lista ${lista.nombre}`} onConfirm={() => remove.mutateAsync(lista.id)} />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {inscritosOf && <ListInscritosPanel key={inscritosOf.id} lista={inscritosOf} onClose={() => setInscritosOf(null)} />}
    </section>
  )
}
