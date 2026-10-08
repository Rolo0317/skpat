import { useState, type KeyboardEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { ticketLabel } from '@skpat/backend/src/lib/ticketPrices'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiErrors'
import { centsToPesos, pesosToCents } from '@/lib/format'
import type { OfertaUbicacion, TipoUbicacion } from '@/lib/operacion'
import { eventOfferPath } from '@/features/events/queries'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { inputClass } from '@/components/ui/styles'

const SPOT_TYPES: TipoUbicacion[] = ['palco', 'mesa']

interface OfferDraft {
  price_pesos: string
  incluye: string[]
}

type Drafts = Record<TipoUbicacion, OfferDraft>

function toDrafts(ofertas: OfertaUbicacion[]): Drafts {
  const draftOf = (tipo: TipoUbicacion): OfferDraft => {
    const oferta = ofertas.find((item) => item.tipo === tipo)
    return { price_pesos: oferta ? String(centsToPesos(oferta.price_cents)) : '', incluye: oferta?.incluye ?? [] }
  }
  return { palco: draftOf('palco'), mesa: draftOf('mesa') }
}

/** Un tipo sin precio no se vende en este evento. */
function toPayload(drafts: Drafts): OfertaUbicacion[] {
  return SPOT_TYPES.filter((tipo) => drafts[tipo].price_pesos !== '').map((tipo) => ({
    tipo,
    price_cents: pesosToCents(Number(drafts[tipo].price_pesos)),
    incluye: drafts[tipo].incluye,
  }))
}

function IncluyeEditor({ tipo, items, onChange }: { tipo: string; items: string[]; onChange: (items: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    if (!draft.trim()) return
    onChange([...items, draft.trim()])
    setDraft('')
  }
  const addOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    add()
  }

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-2" aria-label={`Incluye ${tipo}`}>
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-center gap-1 rounded-full bg-skpat-oro/15 py-1 pl-3 pr-1 text-xs text-skpat-champan">
            {item}
            <button type="button" className="rounded-full p-1 hover:bg-white/10" aria-label={`Quitar ${item}`}
              onClick={() => onChange(items.filter((_, position) => position !== index))}>
              <X size={12} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input className={inputClass} aria-label={`Agregar a lo que incluye ${tipo}`} placeholder="1 botella" value={draft}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={addOnEnter} maxLength={120} />
        <Button variant="secondary" onClick={add} aria-label={`Agregar ítem a ${tipo}`}><Plus size={14} aria-hidden="true" /></Button>
      </div>
    </div>
  )
}

export function OffersEditor({ eventId, ofertas }: { eventId: string; ofertas: OfertaUbicacion[] }) {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Drafts>(() => toDrafts(ofertas))
  const [saved, setSaved] = useState(false)
  const save = useMutation({
    mutationFn: () => api.put(`/events/${eventId}/ofertas`, toPayload(drafts)),
    onSuccess: () => {
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: [eventOfferPath(eventId)] })
    },
  })

  const edit = (tipo: TipoUbicacion, changes: Partial<OfferDraft>) => {
    setSaved(false)
    setDrafts((current) => ({ ...current, [tipo]: { ...current[tipo], ...changes } }))
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); save.mutate() }} className="space-y-3" aria-label="Ofertas de palco y mesa">
      <h3 className="font-bold text-skpat-white">Palco y mesa</h3>
      <p className="text-xs text-skpat-muted">Precio total de la ubicación. Deja el precio vacío si no se vende en este evento.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {SPOT_TYPES.map((tipo) => (
          <fieldset key={tipo} className="space-y-3 rounded-lg border border-skpat-border bg-skpat-bg3 p-3">
            <legend className="px-1 text-sm font-bold text-skpat-champan">{ticketLabel(tipo)}</legend>
            <Field label="Precio (pesos)">
              <input className={inputClass} type="number" min={0} inputMode="numeric" value={drafts[tipo].price_pesos}
                onChange={(e) => edit(tipo, { price_pesos: e.target.value })} />
            </Field>
            <IncluyeEditor tipo={ticketLabel(tipo)} items={drafts[tipo].incluye} onChange={(incluye) => edit(tipo, { incluye })} />
          </fieldset>
        ))}
      </div>
      {save.error && <Alert>{apiErrorMessage(save.error)}</Alert>}
      {saved && <Alert tone="success">Ofertas guardadas.</Alert>}
      <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Guardando…' : 'Guardar palco y mesa'}</Button>
    </form>
  )
}
