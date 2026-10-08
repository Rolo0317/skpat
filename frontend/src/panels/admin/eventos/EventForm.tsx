import { useState, type FormEvent } from 'react'
import { apiErrorMessage } from '@/lib/apiErrors'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { ImageUploadField } from '@/components/ui/ImageUploadField'
import { cardClass, inputClass } from '@/components/ui/styles'
import { PromoterSelect } from '../components/EntitySelects'
import { useFormState } from '@/hooks/useFormState'
import { EMPTY_EVENT_FORM, eventFormToPayload, type EventFormValues, type EventPayload } from './eventFormValues'

interface EventFormProps {
  initial?: EventFormValues
  submitLabel: string
  onSubmit: (payload: EventPayload) => Promise<unknown>
  onCancel?: () => void
}

export function EventForm({ initial = EMPTY_EVENT_FORM, submitLabel, onSubmit, onCancel }: EventFormProps) {
  const { values, setField, reset } = useFormState(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit(eventFormToPayload(values))
      reset()
    } catch (submitError) {
      setError(apiErrorMessage(submitError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className={`${cardClass} grid gap-3 sm:grid-cols-2`}>
      <Field label="Título" className="sm:col-span-2">
        <input className={inputClass} value={values.title} onChange={(e) => setField('title', e.target.value)} required minLength={3} maxLength={200} />
      </Field>
      <Field label="Empieza">
        <input className={inputClass} type="datetime-local" value={values.date} onChange={(e) => setField('date', e.target.value)} required />
      </Field>
      <Field label="Termina" hint="Vacío = 12 horas después del inicio. El QR vale hasta esta hora.">
        <input className={inputClass} type="datetime-local" value={values.ends_at} min={values.date} onChange={(e) => setField('ends_at', e.target.value)} />
      </Field>
      <Field label="Descripción" className="sm:col-span-2">
        <textarea className={inputClass} rows={3} value={values.description} onChange={(e) => setField('description', e.target.value)} maxLength={2000} />
      </Field>
      <Field label="Line-up" hint="Separado por comas." className="sm:col-span-2">
        <input className={inputClass} value={values.lineup} onChange={(e) => setField('lineup', e.target.value)} placeholder="Simon Correa, Santiago Cardona" />
      </Field>
      <Field label="Precio de taquilla (pesos)" hint="Se cobra cuando ya no hay etapa vigente. 0 = por confirmar.">
        <input className={inputClass} type="number" min={0} inputMode="numeric" value={values.price_pesos} onChange={(e) => setField('price_pesos', e.target.value)} required />
      </Field>
      <Field label="Cupos">
        <input className={inputClass} type="number" min={0} inputMode="numeric" value={values.available_spots} onChange={(e) => setField('available_spots', e.target.value)} required />
      </Field>
      <PromoterSelect value={values.promoter_id} onChange={(value) => setField('promoter_id', value)} />
      <label className="flex min-h-10 items-center gap-2 self-end text-sm">
        <input type="checkbox" className="size-4 accent-skpat-oro" checked={values.is_vip} onChange={(e) => setField('is_vip', e.target.checked)} />
        Evento VIP
      </label>
      <div className="sm:col-span-2">
        <ImageUploadField label="Flyer" folder="flyers" value={values.image_url} onChange={(url) => setField('image_url', url)} />
      </div>
      {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
      <div className="flex gap-2 sm:col-span-2 sm:justify-end">
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : submitLabel}</Button>
      </div>
    </form>
  )
}
