import { useState, type FormEvent } from 'react'
import { apiErrorMessage } from '@/lib/apiErrors'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { cardClass, inputClass } from '@/components/ui/styles'
import { EventSelect, PromoterSelect } from '../components/EntitySelects'
import { useFormState } from '@/hooks/useFormState'
import { EMPTY_LIST_FORM, formToInput, type ListaFormValues, type ListaInput } from './guestLists'

interface GuestListFormProps {
  initial?: ListaFormValues
  submitLabel: string
  onSubmit: (input: ListaInput) => Promise<unknown>
  onCancel?: () => void
}

const LIST_ERRORS: Record<string, string> = {
  SlugTaken: 'Ese enlace ya lo usa otra lista. Cambia el nombre o el enlace.',
}
const SLUG_PATTERN = '[a-z0-9-]{3,60}'

export function GuestListForm({ initial = EMPTY_LIST_FORM, submitLabel, onSubmit, onCancel }: GuestListFormProps) {
  const { values, setField, reset } = useFormState(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit(formToInput(values))
      reset()
    } catch (submitError) {
      setError(apiErrorMessage(submitError, LIST_ERRORS))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className={`${cardClass} grid gap-3 sm:grid-cols-2`}>
      <EventSelect value={values.event_id} onChange={(value) => setField('event_id', value)} emptyLabel="Elige un evento" required />
      <Field label="Nombre de la lista">
        <input className={inputClass} value={values.nombre} onChange={(e) => setField('nombre', e.target.value)} required maxLength={80} placeholder="Lista Simon Correa" />
      </Field>
      <PromoterSelect value={values.promoter_id} onChange={(value) => setField('promoter_id', value)} />
      <Field label="Enlace (opcional)" hint="Se genera del nombre si lo dejas vacío.">
        <input className={inputClass} value={values.slug} pattern={SLUG_PATTERN} placeholder="simon-correa"
          onChange={(e) => setField('slug', e.target.value.toLowerCase())} />
      </Field>
      <Field label="Cupo" hint="Vacío = sin límite.">
        <input className={inputClass} type="number" min={1} inputMode="numeric" value={values.cupo} onChange={(e) => setField('cupo', e.target.value)} />
      </Field>
      <Field label="Cierra" hint="Vacío = abierta hasta que la desactives.">
        <input className={inputClass} type="datetime-local" value={values.cierra_at} onChange={(e) => setField('cierra_at', e.target.value)} />
      </Field>
      <label className="flex min-h-10 items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-skpat-oro" checked={values.activa} onChange={(e) => setField('activa', e.target.checked)} />
        Lista activa (acepta registros)
      </label>
      <div className="flex gap-2 sm:justify-end">
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : submitLabel}</Button>
      </div>
      {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
    </form>
  )
}
