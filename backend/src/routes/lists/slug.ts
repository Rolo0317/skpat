import type { SqlClient } from '../../lib/db.js'

/** Debe coincidir con el check de guest_lists.slug: ^[a-z0-9-]{3,60}$. */
export const SLUG_PATTERN = /^[a-z0-9-]{3,60}$/
const MIN_SLUG_LENGTH = 3
/** Deja espacio para el sufijo numérico ("-2", "-15"...) sin pasar de 60. */
const MAX_BASE_LENGTH = 50
const FALLBACK_SLUG = 'lista'
const FIRST_SUFFIX = 2
const DIACRITICS = /[̀-ͯ]/g

/** "Lista VIP de Simón" → "lista-vip-de-simon". */
export function slugify(nombre: string): string {
  const base = nombre
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_BASE_LENGTH)
    .replace(/^-+|-+$/g, '')
  if (!base) return FALLBACK_SLUG
  return base.length < MIN_SLUG_LENGTH ? `${FALLBACK_SLUG}-${base}` : base
}

/** Slug libre a partir del nombre: si ya existe agrega -2, -3... */
export async function uniqueSlug(executor: SqlClient, nombre: string): Promise<string> {
  const base = slugify(nombre)
  // `base` solo tiene [a-z0-9-]: es seguro usarlo dentro de la expresión regular.
  const taken = await executor.many<{ slug: string }>(
    `select slug from guest_lists where slug = $1 or slug ~ ('^' || $1 || '-[0-9]+$')`,
    [base],
  )
  const used = new Set(taken.map((row) => row.slug))
  if (!used.has(base)) return base
  let suffix = FIRST_SUFFIX
  while (used.has(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}
