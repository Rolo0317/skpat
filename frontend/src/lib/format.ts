const CENTS_PER_PESO = 100

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/** Formatea un valor en centavos como pesos colombianos (p. ej. 3000000 -> "$ 30.000"). */
export function formatCOP(cents: number): string {
  return copFormatter.format(cents / CENTS_PER_PESO)
}
