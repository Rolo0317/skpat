import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'

interface ConfirmDeleteButtonProps {
  /** Nombre legible de lo que se borra, p. ej. "la lista VIP Simon". */
  itemName: string
  onConfirm: () => Promise<unknown>
}

/** Botón de borrar que siempre pide confirmación. */
export function ConfirmDeleteButton({ itemName, onConfirm }: ConfirmDeleteButtonProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)} aria-label={`Borrar ${itemName}`}>
        <Trash2 size={14} aria-hidden="true" />
      </Button>
      {open && (
        <ConfirmDialog title="¿Borrar?" confirmLabel="Sí, borrar" variant="danger" busy={busy} onConfirm={confirm} onCancel={() => setOpen(false)}>
          Vas a borrar {itemName}. Esta acción no se puede deshacer.
        </ConfirmDialog>
      )}
    </>
  )
}
