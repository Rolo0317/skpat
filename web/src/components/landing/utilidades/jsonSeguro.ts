/** JSON listo para incrustar en un <script>: escapa "<" para que ningún texto pueda cerrar la etiqueta. */
export function jsonSeguro(valor: unknown): string {
  return JSON.stringify(valor).replace(/</g, '\u003c')
}
