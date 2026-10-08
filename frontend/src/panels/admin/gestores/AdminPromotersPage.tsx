import { useState, type FormEvent } from 'react'
import type { Gestor } from '@/lib/operacion'
import { apiErrorMessage } from '@/lib/apiErrors'
import { whatsappChatUrl } from '@/lib/whatsapp'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import { ConfirmDeleteButton } from '@/components/ui/ConfirmDeleteButton'
import { cardClass, inputClass } from '@/components/ui/styles'
import { usePromoters, type GestorInput } from '../hooks/usePromoters'
import { useFormState } from '@/hooks/useFormState'

const EMPTY_PROMOTER: GestorInput = { nombre: '', whatsapp: '', activo: true }
/** Igual que el CHECK de promoters.whatsapp: indicativo opcional y 10 a 15 dígitos. */
const WHATSAPP_PATTERN = '\\+?[0-9]{10,15}'

const PROMOTER_ERRORS: Record<string, string> = {
  ValidationError: 'Revisa el número: solo dígitos, con indicativo (ej. 573001234567).',
}

export default function AdminPromotersPage() {
  const { items, isLoading, create, update, remove } = usePromoters()
  const { values, setField, reset } = useFormState(EMPTY_PROMOTER)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startEditing = ({ id, ...gestor }: Gestor) => {
    setEditingId(id)
    reset(gestor)
  }

  const finish = () => {
    setEditingId(null)
    setError(null)
    reset()
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      if (editingId) await update.mutateAsync({ id: editingId, changes: values })
      else await create.mutateAsync(values)
      finish()
    } catch (submitError) {
      setError(apiErrorMessage(submitError, PROMOTER_ERRORS))
    }
  }

  const columns: Column<Gestor>[] = [
    { header: 'Nombre', cell: (gestor) => <span className="font-semibold text-skpat-white">{gestor.nombre}</span> },
    { header: 'WhatsApp', cell: (gestor) => gestor.whatsapp },
    {
      header: 'Estado',
      cell: (gestor) => (
        <Button variant={gestor.activo ? 'secondary' : 'ghost'} onClick={() => update.mutate({ id: gestor.id, changes: { activo: !gestor.activo } })}
          aria-label={`${gestor.activo ? 'Desactivar' : 'Activar'} a ${gestor.nombre}`}>
          {gestor.activo ? 'Activo' : 'Inactivo'}
        </Button>
      ),
    },
    {
      header: 'Acciones',
      cell: (gestor) => (
        <div className="flex flex-wrap gap-2">
          <WhatsAppLink href={whatsappChatUrl(gestor.whatsapp)} label="Escribir" />
          <Button variant="secondary" onClick={() => startEditing(gestor)}>Editar</Button>
          <ConfirmDeleteButton itemName={`al gestor ${gestor.nombre}`} onConfirm={() => remove.mutateAsync(gestor.id)} />
        </div>
      ),
    },
  ]

  return (
    <section className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader title="Gestores" description="Quienes cierran las ventas por WhatsApp. El cliente le escribe al gestor de su lista, al del evento o al primero activo." />

      <form onSubmit={submit} className={`${cardClass} mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end`}>
        <Field label="Nombre">
          <input className={inputClass} value={values.nombre} onChange={(e) => setField('nombre', e.target.value)} required maxLength={80} />
        </Field>
        <Field label="WhatsApp (con indicativo)">
          <input className={inputClass} type="tel" inputMode="tel" placeholder="573001234567" pattern={WHATSAPP_PATTERN}
            value={values.whatsapp} onChange={(e) => setField('whatsapp', e.target.value.replace(/[^\d+]/g, ''))} required />
        </Field>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-skpat-oro" checked={values.activo} onChange={(e) => setField('activo', e.target.checked)} />
          Activo
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={create.isPending || update.isPending}>{editingId ? 'Guardar' : 'Agregar gestor'}</Button>
          {editingId && <Button variant="ghost" onClick={finish}>Cancelar</Button>}
        </div>
        {error && <div className="sm:col-span-4"><Alert>{error}</Alert></div>}
      </form>

      {isLoading ? <p className="text-skpat-muted">Cargando…</p> : (
        <DataTable caption="Gestores" rows={items} columns={columns} rowKey={(gestor) => gestor.id} emptyMessage="Aún no hay gestores." />
      )}
    </section>
  )
}
