import { z } from 'zod'

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

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type RecoverInput = z.infer<typeof recoverSchema>
