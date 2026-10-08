import { MessageCircle } from 'lucide-react'
import { buttonClass } from './styles'

interface WhatsAppLinkProps {
  href: string
  label?: string
  /** Botón grande para la acción principal de una pantalla. */
  large?: boolean
}

export function WhatsAppLink({ href, label = 'WhatsApp', large = false }: WhatsAppLinkProps) {
  const size = large ? 'w-full py-4 text-base' : ''
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass('whatsapp', size)}>
      <MessageCircle size={large ? 20 : 16} aria-hidden="true" />
      {label}
    </a>
  )
}
