import { z } from 'zod'

export const loginFormSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
})

export const registerFormSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  nombre: z.string().trim().min(1).max(80),
  cedula: z.string().regex(/^\d{5,15}$/, 'Solo digitos, 5-15 caracteres'),
  telefono: z.string().regex(/^\d{7,15}$/, 'Solo digitos, 7-15 caracteres'),
})

export const recoverFormSchema = z.object({
  email: z.string().email().max(255),
})

export const resetFormSchema = z
  .object({
    password: z.string().min(8).max(128),
    confirm: z.string().min(8).max(128),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Las contrasenas no coinciden',
    path: ['confirm'],
  })

export type LoginForm = z.infer<typeof loginFormSchema>
export type RegisterForm = z.infer<typeof registerFormSchema>
export type RecoverForm = z.infer<typeof recoverFormSchema>
export type ResetForm = z.infer<typeof resetFormSchema>
