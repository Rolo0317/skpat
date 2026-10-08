import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiErrors'
import { centsToPesos, fromDatetimeLocal, pesosToCents, toDatetimeLocal } from '@/lib/format'
import type { Etapa } from '@/lib/operacion'
import { eventOfferPath, EVENTS_QUERY_KEY } from '@/features/events/queries'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { inputClass } from '@/components/ui/styles'

interface StageRow {
  key: number
  nombre: string
  price_pesos: string
  ends_at: string
}

let rowSequence = 0
const newRow = (stage?: Etapa): StageRow => ({
  key: ++rowSequence,
  nombre: stage?.nombre ?? '',
  price_pesos: stage ? String(centsToPesos(stage.price_cents)) : '',
  ends_at: toDatetimeLocal(stage?.ends_at),
})

/** El orden de las filas es el sort_order: la primera etapa no vencida es la vigente. */
const toPayload = (rows: StageRow[]) =>
  rows.map((row, index) => ({
    nombre: row.nombre.trim(),
    price_cents: pesosToCents(Number(row.price_pesos || 0)),
    ends_at: fromDatetimeLocal(row.ends_at),
    sort_order: index,
  }))

function moved<T>(items: T[], from: number, to: number): T[] {
  const copy = [...items]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item!)
  return copy
}

export function StagesEditor({ eventId, etapas }: { eventId: string; etapas: Etapa[] }) {
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<StageRow[]>(() => etapas.map(newRow))
  const [saved, setSaved] = useState(false)
  const save = useMutation({
    mutationFn: () => api.put(`/events/${eventId}/etapas`, toPayload(rows)),
    onSuccess: () => {
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: [eventOfferPath(eventId)] })
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY })
    },
  })

  const edit = (key: number, changes: Partial<StageRow>) => {
    setSaved(false)
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)))
  }
  const reorder = (from: number, to: number) => setRows((current) => moved(current, from, to))

  return (
    <form onSubmit={(event) => { event.preventDefault(); save.mutate() }} className="space-y-3" aria-label="Etapas de precio">
      <h3 className="font-bold text-skpat-white">Etapas de la entrada general</h3>
      <p className="text-xs text-skpat-muted">En orden: se cobra la primera que no haya vencido. Sin fin = vigente hasta la taquilla.</p>
      <ol className="space-y-2">
        {rows.map((row, index) => (
          <li key={row.key} className="grid gap-2 rounded-lg border border-skpat-border bg-skpat-bg3 p-2 sm:grid-cols-[1fr_8rem_12rem_auto]">
            <input className={inputClass} aria-label={`Nombre de la etapa ${index + 1}`} placeholder="Etapa 1" value={row.nombre} required
              onChange={(e) => edit(row.key, { nombre: e.target.value })} />
            <input className={inputClass} aria-label={`Precio en pesos de la etapa ${index + 1}`} type="number" min={0} placeholder="10000"
              value={row.price_pesos} required onChange={(e) => edit(row.key, { price_pesos: e.target.value })} />
            <input className={inputClass} aria-label={`Fin de la etapa ${index + 1}`} type="datetime-local" value={row.ends_at}
              onChange={(e) => edit(row.key, { ends_at: e.target.value })} />
            <div className="flex gap-1">
              <Button variant="ghost" aria-label={`Subir etapa ${index + 1}`} disabled={index === 0} onClick={() => reorder(index, index - 1)}><ArrowUp size={14} aria-hidden="true" /></Button>
              <Button variant="ghost" aria-label={`Bajar etapa ${index + 1}`} disabled={index === rows.length - 1} onClick={() => reorder(index, index + 1)}><ArrowDown size={14} aria-hidden="true" /></Button>
              <Button variant="danger" aria-label={`Quitar etapa ${index + 1}`} onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}><Trash2 size={14} aria-hidden="true" /></Button>
            </div>
          </li>
        ))}
      </ol>
      {save.error && <Alert>{apiErrorMessage(save.error)}</Alert>}
      {saved && <Alert tone="success">Etapas guardadas.</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setRows((current) => [...current, newRow()])}><Plus size={14} aria-hidden="true" /> Agregar etapa</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Guardando…' : 'Guardar etapas'}</Button>
      </div>
    </form>
  )
}
