import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { recoverFormSchema, type RecoverForm } from './schemas'
import { api } from '@/lib/api'

export default function RecoverPage() {
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoverForm>({ resolver: zodResolver(recoverFormSchema) })

  const onSubmit = async (data: RecoverForm) => {
    try {
      await api.post('/auth/recover', { email: data.email })
    } catch {
      // Intentionally swallow — same message regardless (prevents enumeration)
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-bold">Revisa tu correo</h1>
          <p data-testid="recover-success" className="text-neutral-400">
            Si el correo existe, recibiras un enlace en breve.
          </p>
          <Link to="/login" className="underline text-sm">
            Volver al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 bg-neutral-900 p-6 rounded-lg border border-neutral-800"
      >
        <h1 className="text-2xl font-bold">Recuperar contrasena</h1>
        <p className="text-sm text-neutral-400">
          Te enviaremos un enlace para crear una nueva contrasena.
        </p>
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
        <button
          disabled={isSubmitting}
          className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 py-2 rounded font-semibold"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
        </button>
        <Link to="/login" className="block text-center text-sm underline text-neutral-400">
          Volver al login
        </Link>
      </form>
    </div>
  )
}
