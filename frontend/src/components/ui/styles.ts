/** Clases compartidas de la UI de operación (tema dorado de src/index.css). */

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-skpat-champan'

export const inputClass =
  'w-full rounded-lg border border-skpat-border bg-skpat-bg3 px-3 py-2.5 text-sm text-skpat-white ' +
  'placeholder:text-skpat-muted/60 focus:border-skpat-oro focus:outline-none ' + FOCUS_RING

export const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-skpat-muted'

export const cardClass = 'rounded-xl border border-skpat-border bg-skpat-card p-4'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'whatsapp' | 'ghost'

const BUTTON_BASE =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' + FOCUS_RING

/** Texto oscuro sobre dorado; el verde de WhatsApp también lleva texto oscuro por contraste. */
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-skpat-oro text-skpat-bg hover:bg-skpat-champan',
  secondary: 'border border-skpat-oro/40 bg-skpat-oro/10 text-skpat-champan hover:bg-skpat-oro/20',
  danger: 'border border-skpat-red/40 bg-skpat-red/10 text-red-300 hover:bg-skpat-red/20',
  whatsapp: 'bg-[#25d366] text-skpat-bg hover:bg-[#3ee07a]',
  ghost: 'text-skpat-muted hover:bg-white/5 hover:text-skpat-text',
}

export function buttonClass(variant: ButtonVariant = 'primary', extra = ''): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${extra}`.trim()
}
