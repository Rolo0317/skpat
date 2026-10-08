import type { ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import type { ButtonVariant } from './styles'

interface ConfirmDialogProps {
  title: string
  children: ReactNode
  confirmLabel: string
  variant?: ButtonVariant
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Confirmación explícita antes de una acción que cambia dinero o datos. */
export function ConfirmDialog({
  title, children, confirmLabel, variant = 'primary', busy = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="text-sm text-skpat-text">{children}</div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Volver</Button>
        <Button variant={variant} onClick={onConfirm} disabled={busy} data-autofocus>
          {busy ? 'Procesando…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
