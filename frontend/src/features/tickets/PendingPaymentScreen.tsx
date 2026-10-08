import { Clock } from 'lucide-react'
import { formatCOP } from '@/lib/format'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import type { PurchaseResult } from './purchase'

/** Después de comprar: el pago se cierra por WhatsApp y el QR llega cuando el staff lo confirma. */
export function PendingPaymentScreen({ result, email }: { result: PurchaseResult; email: string }) {
  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div>
        <Clock size={44} className="mx-auto text-skpat-oro" aria-hidden="true" />
        <h1 className="mt-3 text-3xl font-black text-skpat-white">Pendiente de pago</h1>
        <p className="mt-2 text-sm text-skpat-muted">Tu entrada está apartada. Falta un paso: pagar con nuestro gestor por WhatsApp.</p>
      </div>

      <div className="rounded-2xl border border-skpat-border bg-skpat-card p-5">
        <p className="font-bold text-skpat-white">{result.event_title}</p>
        <p className="text-sm text-skpat-muted">Entrada general · {result.price_stage}</p>
        <p className="mt-2 text-2xl font-black text-skpat-champan">{formatCOP(result.price_cents)}</p>
      </div>

      {result.whatsapp_url ? (
        <WhatsAppLink href={result.whatsapp_url} label="Continuar por WhatsApp" large />
      ) : (
        <p className="rounded-lg border border-skpat-oro/30 bg-skpat-oro/10 p-4 text-sm text-skpat-champan">
          Un gestor de Skpat te contactará para cerrar el pago.
        </p>
      )}

      <ol className="space-y-2 rounded-xl border border-skpat-border bg-skpat-bg3 p-4 text-left text-sm text-skpat-text">
        <li>1. Escríbele al gestor: el mensaje ya lleva tu nombre y el número de tu compra.</li>
        <li>2. Paga como te indique el gestor.</li>
        <li>3. Cuando el equipo confirme el pago, te llega el <strong className="text-skpat-champan">QR a {email}</strong> (y en "Mis tiquetes" si compraste con tu cuenta).</li>
      </ol>
      <p className="text-xs text-skpat-muted">Sin pago confirmado el QR no sirve en la puerta. Consumo obligatorio dentro del lugar.</p>

      <a href="/" className="inline-block text-sm text-skpat-oro hover:text-skpat-champan">← Volver al inicio</a>
    </div>
  )
}
