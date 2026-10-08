import type { ReactNode } from 'react'

type AlertTone = 'error' | 'success' | 'info'

const TONE_CLASSES: Record<AlertTone, string> = {
  error: 'border-red-900 bg-red-950/60 text-red-200',
  success: 'border-emerald-800 bg-emerald-950/50 text-emerald-200',
  info: 'border-skpat-oro/30 bg-skpat-oro/10 text-skpat-champan',
}

export function Alert({ tone = 'error', children }: { tone?: AlertTone; children: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${TONE_CLASSES[tone]}`}>
      {children}
    </div>
  )
}
