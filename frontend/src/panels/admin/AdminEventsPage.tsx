import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import type { SkpatEvent } from '@/features/landing/types'
import { EVENTS_PATH, EVENTS_QUERY_KEY, useEvents } from '@/features/events/queries'
import { api, apiAssetUrl } from '@/lib/api'
import { formatCOP, formatDateTime } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDeleteButton } from '@/components/ui/ConfirmDeleteButton'
import { cardClass } from '@/components/ui/styles'
import { usePromoters } from './hooks/usePromoters'
import { EventForm } from './eventos/EventForm'
import { EventSalesPanel } from './eventos/EventSalesPanel'
import { eventToForm, type EventPayload } from './eventos/eventFormValues'

type Expanded = { id: string; panel: 'editar' | 'precios' } | null

function eventSchedule(event: SkpatEvent): string {
  const inicio = formatDateTime(event.date)
  return event.ends_at ? `${inicio} → ${formatDateTime(event.ends_at)}` : inicio
}

export default function AdminEventsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { events, isLoading } = useEvents()
  const { items: gestores } = usePromoters()
  const [creating, setCreating] = useState(false)
  const [expanded, setExpanded] = useState<Expanded>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY })
  const create = useMutation({ mutationFn: (payload: EventPayload) => api.post(EVENTS_PATH, payload), onSuccess: refresh })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EventPayload }) => api.put(`${EVENTS_PATH}/${id}`, payload),
    onSuccess: refresh,
  })
  const remove = useMutation({ mutationFn: (id: string) => api.del(`${EVENTS_PATH}/${id}`), onSuccess: refresh })

  const gestorName = (id: string | null | undefined) => gestores.find((gestor) => gestor.id === id)?.nombre ?? 'Automático'
  const toggle = (id: string, panel: 'editar' | 'precios') =>
    setExpanded((current) => (current?.id === id && current.panel === panel ? null : { id, panel }))

  return (
    <section className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title="Eventos"
        description="La web muestra solo el evento activo actual. Configura etapas, palcos y mesas en Precios."
        actions={!creating && <Button onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" /> Nuevo evento</Button>}
      />

      {creating && (
        <div className="mb-6">
          <EventForm submitLabel="Crear evento" onCancel={() => setCreating(false)}
            onSubmit={async (payload) => { await create.mutateAsync(payload); setCreating(false) }} />
        </div>
      )}

      {isLoading && <p className="text-skpat-muted">Cargando…</p>}
      <ul className="grid gap-4">
        {events.map((event) => (
          <li key={event.id} className={`${cardClass} space-y-4`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              {event.image_url && <img src={apiAssetUrl(event.image_url)} alt={`Flyer de ${event.title}`} className="h-24 w-24 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-skpat-white">{event.title}</h2>
                <p className="text-sm text-skpat-muted">{eventSchedule(event)}</p>
                <p className="mt-1 text-sm">
                  {event.precio_vigente && <span className="text-skpat-champan">{event.precio_vigente.nombre}: {formatCOP(event.precio_vigente.price_cents)} · </span>}
                  cupos {event.available_spots} · gestor {gestorName(event.promoter_id)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" aria-expanded={expanded?.id === event.id && expanded.panel === 'precios'} onClick={() => toggle(event.id, 'precios')}>Precios</Button>
                <Button variant="ghost" aria-expanded={expanded?.id === event.id && expanded.panel === 'editar'} onClick={() => toggle(event.id, 'editar')}>Editar</Button>
                <Button variant="ghost" onClick={() => navigate(`/admin/eventos/${event.id}/asistentes`)}>Asistentes</Button>
                <ConfirmDeleteButton itemName={`el evento ${event.title}`} onConfirm={() => remove.mutateAsync(event.id)} />
              </div>
            </div>
            {expanded?.id === event.id && expanded.panel === 'precios' && <EventSalesPanel eventId={event.id} />}
            {expanded?.id === event.id && expanded.panel === 'editar' && (
              <EventForm key={event.id} initial={eventToForm(event)} submitLabel="Guardar cambios" onCancel={() => setExpanded(null)}
                onSubmit={async (payload) => { await update.mutateAsync({ id: event.id, payload }); setExpanded(null) }} />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
