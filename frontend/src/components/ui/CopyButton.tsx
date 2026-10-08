import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from './Button'

const FEEDBACK_MS = 2_000

interface CopyButtonProps {
  text: string
  label: string
}

/** Copia un texto al portapapeles y avisa (también a lectores de pantalla). */
export function CopyButton({ text, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
  }

  return (
    <Button variant="secondary" onClick={copy} aria-label={label}>
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copiado' : 'Copiar enlace'}</span>
    </Button>
  )
}
