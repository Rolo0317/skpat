import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { loginFormSchema, type LoginForm } from './schemas'
import { useAuth } from './useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginFormSchema) })

  const onSubmit = async (data: LoginForm) => {
    setServerError(null)
    const { error } = await signIn(data.email, data.password)
    if (error) setServerError(error)
    // On success, AuthContext user state updates and RootRedirect handles navigation.
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 bg-neutral-900 p-6 rounded-lg border border-neutral-800"
      >
        <h1 className="text-2xl font-bold">Iniciar sesion</h1>
        <div>
          <label className="block text-sm mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2"
          />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="password">
            Contrasena
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2"
          />
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>
        {serverError && (
          <p className="text-red-400 text-sm" role="alert">
            {serverError}
          </p>
        )}
        <button
          disabled={isSubmitting}
          className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 py-2 rounded font-semibold"
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
        <div className="flex justify-between text-sm text-neutral-400 pt-2">
          <Link to="/register" className="underline">
            Crear cuenta
          </Link>
          <Link to="/recover" className="underline">
            Olvide mi contrasena
          </Link>
        </div>
      </form>
    </div>
  )
}
