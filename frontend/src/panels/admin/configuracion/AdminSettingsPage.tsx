import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiErrors'
import type { VenueSettings } from '@/lib/operacion'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { cardClass, inputClass } from '@/components/ui/styles'
import { useFormState } from '@/hooks/useFormState'

const PUBLIC_SETTINGS_PATH = '/settings'
const ADMIN_SETTINGS_PATH = '/admin/settings'
const SETTINGS_QUERY_KEY = [PUBLIC_SETTINGS_PATH]

interface SettingsForm {
  direccion: string
  referencia: string
  mapa_url: string
}

const EMPTY_SETTINGS: SettingsForm = { direccion: '', referencia: '', mapa_url: '' }

const toForm = (settings: VenueSettings): SettingsForm => ({
  direccion: settings.direccion ?? '',
  referencia: settings.referencia ?? '',
  mapa_url: settings.mapa_url ?? '',
})

const toPayload = (values: SettingsForm): VenueSettings => ({
  direccion: values.direccion.trim() || null,
  referencia: values.referencia.trim() || null,
  mapa_url: values.mapa_url.trim() || null,
})

export default function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const { values, setField, reset } = useFormState(EMPTY_SETTINGS)
  const [saved, setSaved] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: SETTINGS_QUERY_KEY, queryFn: () => api.get<VenueSettings>(PUBLIC_SETTINGS_PATH) })
  const save = useMutation({
    mutationFn: () => api.put<VenueSettings>(ADMIN_SETTINGS_PATH, toPayload(values)),
    onSuccess: () => {
      setSaved(true)
      return queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY })
    },
  })

  useEffect(() => {
    if (data) reset(toForm(data))
  }, [data, reset])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSaved(false)
    save.mutate()
  }

  return (
    <section className="mx-auto max-w-2xl p-4 sm:p-6">
      <PageHeader title="Configuración" description="Datos del lugar que ve el público en la web y en los correos." />
      {isLoading ? <p className="text-skpat-muted">Cargando…</p> : (
        <form onSubmit={submit} className={`${cardClass} grid gap-4`}>
          <Field label="Dirección" hint="Sector Plaza de las Américas, Bogotá. Escribe la dirección exacta cuando esté confirmada.">
            <input className={inputClass} value={values.direccion} onChange={(e) => setField('direccion', e.target.value)} maxLength={200} />
          </Field>
          <Field label="Referencia" hint="Ej. Frente a Plaza de las Américas · Abierto viernes a lunes sin límite de horario.">
            <input className={inputClass} value={values.referencia} onChange={(e) => setField('referencia', e.target.value)} maxLength={200} />
          </Field>
          <Field label="Enlace del mapa" hint="Pega el enlace de Google Maps para compartir la ubicación.">
            <input className={inputClass} type="url" value={values.mapa_url} onChange={(e) => setField('mapa_url', e.target.value)} placeholder="https://maps.app.goo.gl/…" />
          </Field>
          {save.error && <Alert>{apiErrorMessage(save.error)}</Alert>}
          {saved && <Alert tone="success">Datos del lugar guardados.</Alert>}
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      )}
    </section>
  )
}
