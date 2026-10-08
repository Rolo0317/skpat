import { z } from 'zod'
import { HttpError } from './db/types.js'

const passwordSchema = z.string().min(8).max(128)
const emailSchema = z.string().trim().toLowerCase().email().max(255)
const cedulaSchema = z.string().regex(/^\d{5,15}$/, 'Cedula must be 5-15 digits')
const telefonoSchema = z.string().regex(/^\d{7,15}$/, 'Telefono must be 7-15 digits')
const nombreSchema = z.string().trim().min(1).max(80)

// Default behavior: strip unknown keys (prevents privilege-escalation via role injection)
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nombre: nombreSchema,
  cedula: cedulaSchema,
  telefono: telefonoSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const refreshSchema = z.object({
  refresh_token: z.string().min(10),
})

export const recoverSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(64).max(64),
  password: passwordSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type RecoverInput = z.infer<typeof recoverSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const SKPAT_ROLES = ['cliente', 'mesero', 'portero', 'admin'] as const
export type SkpatRole = (typeof SKPAT_ROLES)[number]
export const skpatRoleSchema = z.enum(SKPAT_ROLES)

export const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  role: skpatRoleSchema,
})

export type AssignRoleInput = z.infer<typeof assignRoleSchema>

/** Datos de quien recibe un tiquete o reserva (compra, palco/mesa o lista). */
export const buyerSchema = z.object({
  nombre: nombreSchema,
  email: emailSchema,
  cedula: cedulaSchema,
  telefono: telefonoSchema.optional(),
})

export type BuyerInput = z.infer<typeof buyerSchema>

const MAX_URL_LENGTH = 2048
const isAbsoluteHttpUrl = (value: string) => /^https?:\/\//i.test(value) && URL.canParse(value)

/** URL absoluta http(s) o ruta servida por la propia web (p. ej. '/flyers/noche.jpg'). */
export const publicUrlSchema = z
  .string()
  .trim()
  .max(MAX_URL_LENGTH)
  .refine((value) => value.startsWith('/') || isAbsoluteHttpUrl(value), 'Must be an http(s) URL or a root-relative path')

export const isoDateSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid ISO date')

/** Texto libre opcional: vacío o solo espacios se guarda como null. */
export const optionalTextSchema = (maxLength: number) =>
  z.string().trim().max(maxLength).transform((value) => value || null).nullable()

/** Valida `input` o aborta la petición con 400 ValidationError (lo traduce el handler central). */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) throw new HttpError(400, 'ValidationError', { issues: parsed.error.issues })
  return parsed.data
}
