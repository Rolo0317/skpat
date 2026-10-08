import { useState, type FormEvent } from 'react'
import { apiErrorMessage } from '@/lib/apiErrors'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { ImageUploadField } from '@/components/ui/ImageUploadField'
import { cardClass, inputClass } from '@/components/ui/styles'
import { EventSelect } from '../components/EntitySelects'
import { useFormState } from '@/hooks/useFormState'
import { announcementFormToInput, EMPTY_ANNOUNCEMENT_FORM, type AnuncioFormValues, type AnuncioInput } from './announcements'

interface AnnouncementFormProps {
  initial?: AnuncioFormValues
  submitLabel: string
  onSubmit: (input: AnuncioInput) => Promise<unknown>
  onCancel: () => void
}

export function AnnouncementForm({ initial = EMPTY_ANNOUNCEMENT_FORM, submitLabel, onSubmit, onCancel }: AnnouncementFormProps) {
  const { values, setField } = useFormState(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit(announcementFormToInput(values))
    } catch (submitError) {
      setError(apiErrorMessage(submitError))
    } finally {
      setSaving(false)
    }
  }

  const checkbox = (field: 'activo' | 'fijado', label: string) => (
    <label className="flex min-h-10 items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-skpat-oro" checked={values[field]} onChange={(e) => setField(field, e.target.checked)} />
      {label}
    </label>
  )

  return (
    <form onSubmit={submit} className={`${cardClass} grid gap-3 sm:grid-cols-2`}>
      <Field label="Título" className="sm:col-span-2">
        <input className={inputClass} value={values.titulo} onChange={(e) => setField('titulo', e.target.value)} required maxLength={120} />
      </Field>
      <Field label="Texto" className="sm:col-span-2">
        <textarea className={inputClass} rows={3} value={values.cuerpo} onChange={(e) => setField('cuerpo', e.target.value)} maxLength={1000} />
      </Field>
      <div className="sm:col-span-2">
        <ImageUploadField label="Imagen" folder="anuncios" value={values.image_url} onChange={(url) => setField('image_url', url)} />
      </div>
      <Field label="Texto del botón">
        <input className={inputClass} value={values.cta_label} onChange={(e) => setField('cta_label', e.target.value)} placeholder="Compra tu entrada" maxLength={40} />
      </Field>
      <Field label="Enlace del botón">
        <input className={inputClass} value={values.cta_url} onChange={(e) => setField('cta_url', e.target.value)} placeholder="/#entrada o https://…" />
      </Field>
      <EventSelect value={values.event_id} onChange={(value) => setField('event_id', value)} emptyLabel="General (sin evento)" />
      <div />
      <Field label="Visible desde" hint="Vacío = desde ahora.">
        <input className={inputClass} type="datetime-local" value={values.starts_at} onChange={(e) => setField('starts_at', e.target.value)} />
      </Field>
      <Field label="Visible hasta" hint="Vacío = sin vencimiento.">
        <input className={inputClass} type="datetime-local" value={values.ends_at} onChange={(e) => setField('ends_at', e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-4">
        {checkbox('activo', 'Activo')}
        {checkbox('fijado', 'Fijar arriba')}
      </div>
      <div className="flex gap-2 sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : submitLabel}</Button>
      </div>
      {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
    </form>
  )
}
