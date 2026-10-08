const CENTS_PER_PESO = 100
const pesoFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/** Montos guardados en centavos -> "$30.000 COP". */
export const formatCop = (cents: number) => `$${pesoFormatter.format(cents / CENTS_PER_PESO)} COP`
