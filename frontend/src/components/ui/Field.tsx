import type { ReactNode } from 'react'
import { labelClass } from './styles'

interface FieldProps {
  label: string
  hint?: string
  className?: string
  children: ReactNode
}

/** Etiqueta envolvente: asocia el texto al control sin necesitar ids. */
export function Field({ label, hint, className = '', children }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-skpat-muted">{hint}</span>}
    </label>
  )
}
