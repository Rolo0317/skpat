import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiErrors'
import { formatCOP, formatDateTime } from '@/lib/format'
import type { TiqueteEmitido } from '@/lib/operacion'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import { Alert } from '@/components/ui/Alert'
import { IssuedQrModal } from './IssuedQrModal'
import { usePendingPayments, PENDING_PAYMENTS_QUERY_KEY } from './usePendingPayments'
import { issuedTickets, paymentActionPath, toPendingItems, type PaymentAction, type PendingItem } from './pendingPayments'

interface PendingDecision {
  item: PendingItem
  action: PaymentAction
}

interface IssuedQrs {
  titular: string
  tickets: TiqueteEmitido[]
}

const ACTION_ERRORS: Record<string, string> = {
  AlreadyProcessed: 'Otro miembro del equipo ya procesó este pago.',
  NotFound: 'Este pago ya no existe.',
  SoldOut: 'No quedan cupos en el evento para confirmar esta reserva.',
}

const DECISION_COPY: Record<PaymentAction, { title: string; confirmLabel: string; explanation: string }> = {
  confirmar: {
    title: '¿Confirmar pago?',
    confirmLabel: 'Sí, el pago llegó',
    explanation: 'Confirma solo si el pago ya llegó. Se activarán los QR y se enviarán por correo.',
  },
  cancelar: {
    title: '¿Cancelar solicitud?',
    confirmLabel: 'Sí, cancelar',
    explanation: 'La solicitud se cancelará y el cupo quedará libre para otra persona.',
  },
}

function DecisionSummary({ item, action }: PendingDecision) {
  return (
    <>
      <p className="mb-3">{DECISION_COPY[action].explanation}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-skpat-bg3 p-3">
        <dt className="text-skpat-muted">Cliente</dt><dd>{item.nombre}</dd>
        <dt className="text-skpat-muted">Evento</dt><dd>{item.event_title}</dd>
        <dt className="text-skpat-muted">Detalle</dt><dd>{item.detalle}</dd>
        <dt className="text-skpat-muted">Monto</dt><dd className="font-bold text-skpat-champan">{formatCOP(item.price_cents)}</dd>
      </dl>
    </>
  )
}

function stackedCell(primary: string, secondary: string) {
  return (
    <>
      <div className="font-semibold text-skpat-white">{primary}</div>
      <div className="text-xs text-skpat-muted">{secondary}</div>
    </>
  )
}

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, error, count } = usePendingPayments()
  const [decision, setDecision] = useState<PendingDecision | null>(null)
  const [issued, setIssued] = useState<IssuedQrs | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const decide = useMutation({
    mutationFn: ({ item, action }: PendingDecision) => api.post<unknown>(paymentActionPath(item, action)),
    onSuccess: (response, { item, action }) => {
      setActionError(null)
      const tickets = issuedTickets(response)
      if (action === 'confirmar' && tickets.length > 0) setIssued({ titular: item.nombre, tickets })
    },
    onError: (mutationError) => setActionError(apiErrorMessage(mutationError, ACTION_ERRORS)),
    onSettled: () => {
      setDecision(null)
      return queryClient.invalidateQueries({ queryKey: PENDING_PAYMENTS_QUERY_KEY })
    },
  })

  const columns: Column<PendingItem>[] = [
    { header: 'Cliente', cell: (item) => stackedCell(item.nombre, item.email) },
    { header: 'Evento', cell: (item) => stackedCell(item.event_title, formatDateTime(item.event_date)) },
    { header: 'Detalle', cell: (item) => item.detalle },
    { header: 'Monto', cell: (item) => <span className="font-bold text-skpat-champan">{formatCOP(item.price_cents)}</span> },
    { header: 'Solicitado', cell: (item) => <span className="text-xs text-skpat-muted">{formatDateTime(item.created_at)}</span> },
    {
      header: 'Acciones',
      cell: (item) => (
        <div className="flex flex-wrap gap-2">
          {item.contactUrl && <WhatsAppLink href={item.contactUrl} />}
          <Button onClick={() => setDecision({ item, action: 'confirmar' })} aria-label={`Confirmar pago de ${item.nombre}`}>
            <Check size={16} aria-hidden="true" /> Confirmar
          </Button>
          <Button variant="danger" onClick={() => setDecision({ item, action: 'cancelar' })} aria-label={`Cancelar solicitud de ${item.nombre}`}>
            <X size={16} aria-hidden="true" /> Cancelar
          </Button>
        </div>
      ),
    },
  ]

  return (
    <section className="mx-auto max-w-6xl p-4 sm:p-6">
      <PageHeader
        title="Pagos pendientes"
        description={`${count} por confirmar · se actualiza cada 15 s. Confirma solo cuando el pago llegó por WhatsApp.`}
      />
      <div className="mb-4 space-y-2">
        {error && <Alert>{apiErrorMessage(error)}</Alert>}
        {actionError && <Alert>{actionError}</Alert>}
      </div>
      {isLoading ? (
        <p className="text-skpat-muted">Cargando…</p>
      ) : (
        <DataTable
          caption="Pagos pendientes de confirmar"
          rows={data ? toPendingItems(data) : []}
          columns={columns}
          rowKey={(item) => `${item.kind}-${item.id}`}
          emptyMessage="No hay pagos pendientes. Todo al día."
        />
      )}

      {decision && (
        <ConfirmDialog
          title={DECISION_COPY[decision.action].title}
          confirmLabel={DECISION_COPY[decision.action].confirmLabel}
          variant={decision.action === 'confirmar' ? 'primary' : 'danger'}
          busy={decide.isPending}
          onConfirm={() => decide.mutate(decision)}
          onCancel={() => setDecision(null)}
        >
          <DecisionSummary {...decision} />
        </ConfirmDialog>
      )}

      {issued && <IssuedQrModal titular={issued.titular} tickets={issued.tickets} onClose={() => setIssued(null)} />}
    </section>
  )
}
