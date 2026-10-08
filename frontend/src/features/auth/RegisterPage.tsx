import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { registerFormSchema, type RegisterForm } from './schemas'
import { useAuth } from './useAuth'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const nav = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerFormSchema) })

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null)
    const { error } = await signUp(data)
    if (error) {
      setServerError(error)
      return
    }
    nav('/cliente', { replace: true })
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md space-y-4 bg-neutral-900 p-6 rounded-lg border border-neutral-800"
      >
        <h1 className="text-2xl font-bold">Crear cuenta</h1>
        {(['email', 'password', 'nombre', 'cedula', 'telefono'] as const).map((field) => (
          <div key={field}>
            <label className="block text-sm mb-1 capitalize" htmlFor={field}>
              {field}
            </label>
            <input
              id={field}
              type={field === 'password' ? 'password' : 'text'}
              autoComplete={field === 'password' ? 'new-password' : field}
              {...register(field)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2"
            />
            {errors[field] && (
              <p className="text-red-400 text-xs mt-1">{errors[field]?.message as string}</p>
            )}
          </div>
        ))}
        {serverError && (
          <p className="text-red-400 text-sm" role="alert">
            {serverError}
          </p>
        )}
        <button
          disabled={isSubmitting}
          className="w-full bg-skpat-oro text-skpat-bg hover:bg-skpat-champan disabled:opacity-50 py-2 rounded font-semibold"
        >
          {isSubmitting ? 'Creando...' : 'Crear cuenta'}
        </button>
        <Link to="/login" className="block text-center text-sm underline text-neutral-400">
          Ya tengo cuenta
        </Link>
      </form>
    </div>
  )
}
