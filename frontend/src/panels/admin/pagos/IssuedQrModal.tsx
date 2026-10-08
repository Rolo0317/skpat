import { Download } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { downloadDataUrl } from '@/lib/download'
import type { TiqueteEmitido } from '@/lib/operacion'

interface IssuedQrModalProps {
  titular: string
  tickets: TiqueteEmitido[]
  onClose: () => void
}

const qrFilename = (titular: string, position: number) =>
  `skpat-qr-${titular.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${position}.png`

/** QR recién emitidos al confirmar un pago, listos para descargar y reenviar por WhatsApp. */
export function IssuedQrModal({ titular, tickets, onClose }: IssuedQrModalProps) {
  const download = (ticket: TiqueteEmitido, index: number) => downloadDataUrl(qrFilename(titular, index + 1), ticket.qr_data_url)

  return (
    <Modal title={`QR generados para ${titular}`} onClose={onClose}>
      <p className="mb-4 text-sm text-skpat-muted">
        Ya se enviaron por correo. También puedes descargarlos y mandarlos por WhatsApp. Cada QR vale para una persona.
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tickets.map((ticket, index) => (
          <li key={ticket.ticket_id} className="flex flex-col items-center gap-2 rounded-lg border border-skpat-border bg-skpat-bg3 p-2">
            <img src={ticket.qr_data_url} alt={`QR ${index + 1} de ${tickets.length}`} className="w-full rounded bg-white" />
            <Button variant="secondary" className="w-full" onClick={() => download(ticket, index)}>
              <Download size={14} aria-hidden="true" /> QR {index + 1}
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        {tickets.length > 1 && (
          <Button onClick={() => tickets.forEach(download)}>
            <Download size={16} aria-hidden="true" /> Descargar todos
          </Button>
        )}
      </div>
    </Modal>
  )
}
