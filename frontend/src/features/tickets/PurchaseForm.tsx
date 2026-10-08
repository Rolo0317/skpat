import { useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatCOP } from '@/lib/format'
import { Field } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { buttonClass, inputClass } from '@/components/ui/styles'
import { useFormState } from '@/hooks/useFormState'
import { buyerPayload, buyerValidationError, EMPTY_BUYER, PURCHASE_ERRORS, type BuyerForm, type PurchaseResult } from './purchase'

interface PurchaseFormProps {
  eventId: string
  priceCents: number
  onPurchased: (result: PurchaseResult, buyer: BuyerForm) => void
}

const onlyDigits = (value: string) => value.replace(/\D/g, '')

/** Datos del comprador de una entrada general al precio vigente. */
export function PurchaseForm({ eventId, priceCents, onPurchased }: PurchaseFormProps) {
  const { values, setField } = useFormState(EMPTY_BUYER)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const validationError = buyerValidationError(values)
    if (validationError) return setError(validationError)
    setSubmitting(true)
    setError(null)
    try {
      onPurchased(await api.post<PurchaseResult>('/tickets/purchase', buyerPayload(eventId, values)), values)
    } catch (purchaseError) {
      setError(apiErrorMessage(purchaseError, PURCHASE_ERRORS))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field label="Nombre completo *">
        <input className={inputClass} value={values.nombre} onChange={(e) => setField('nombre', e.target.value)} required maxLength={80}
          autoComplete="name" placeholder="Ej. Juan Carlos Pérez" />
      </Field>
      <Field label="Correo electrónico *" hint="Aquí te llega el QR cuando se confirme el pago.">
        <input className={inputClass} type="email" value={values.email} onChange={(e) => setField('email', e.target.value)} required
          autoComplete="email" placeholder="tu@email.com" />
      </Field>
      <Field label="Cédula *" hint="Solo dígitos. Se cifra antes de guardarla.">
        <input className={inputClass} inputMode="numeric" value={values.cedula} onChange={(e) => setField('cedula', onlyDigits(e.target.value))}
          required maxLength={15} placeholder="1234567890" />
      </Field>
      <Field label="Teléfono (opcional)">
        <input className={inputClass} type="tel" inputMode="numeric" value={values.telefono} onChange={(e) => setField('telefono', onlyDigits(e.target.value))}
          maxLength={15} autoComplete="tel" placeholder="3001234567" />
      </Field>
      {error && <Alert>{error}</Alert>}
      <button type="submit" disabled={submitting} className={buttonClass('primary', 'w-full rounded-full py-4 text-base')}>
        {submitting ? 'Procesando…' : `Apartar entrada — ${formatCOP(priceCents)}`}
      </button>
      <p className="text-center text-xs text-skpat-muted">
        El pago se cierra por WhatsApp con un gestor. La entrada es personal e intransferible.
      </p>
    </form>
  )
}
