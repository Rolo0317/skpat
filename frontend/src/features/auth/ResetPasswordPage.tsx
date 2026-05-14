import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { resetFormSchema, type ResetForm } from './schemas'
import { api } from '@/lib/api'

export default function ResetPasswordPage() {
  const nav = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(resetFormSchema) })

  // Extract reset token from URL hash: #token=xxx&type=recovery
  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  const resetToken = hashParams.get('token') ?? ''
  const isRecovery = hashParams.get('type') === 'recovery'

  const onSubmit = async (data: ResetForm) => {
    setServerError(null)
    try {
      await api.post('/auth/reset-password', { token: resetToken, password: data.password })
      setDone(true)
      setTimeout(() => nav('/login', { replace: true }), 1500)
    } catch (e: unknown) {
      const err = e as { message?: string }
      setServerError(err?.message ?? 'No se pudo actualizar la contrasena')
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <p>Contrasena actualizada. Redirigiendo al login...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 bg-neutral-900 p-6 rounded-lg border border-neutral-800"
      >
        <h1 className="text-2xl font-bold">Nueva contrasena</h1>
        {!isRecovery && (
          <p className="text-yellow-400 text-sm">Validando enlace de recuperacion...</p>
        )}
        <div>
          <label className="block text-sm mb-1" htmlFor="password">
            Nueva contrasena
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2"
          />
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="confirm">
            Confirmar contrasena
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            {...register('confirm')}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2"
          />
          {errors.confirm && <p className="text-red-400 text-xs mt-1">{errors.confirm.message}</p>}
        </div>
        {serverError && (
          <p className="text-red-400 text-sm" role="alert">
            {serverError}
          </p>
        )}
        <button
          disabled={isSubmitting || !isRecovery}
          className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 py-2 rounded font-semibold"
        >
          {isSubmitting ? 'Actualizando...' : 'Actualizar contrasena'}
        </button>
        <Link to="/login" className="block text-center text-sm underline text-neutral-400">
          Cancelar
        </Link>
      </form>
    </div>
  )
}
