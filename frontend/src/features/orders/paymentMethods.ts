export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'transferencia', label: 'Transferencia' },
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'efectivo'
