import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate } from 'react-router-dom'
import { Mail, Lock, LogIn } from 'lucide-react'
import { loginFormSchema, type LoginForm } from './schemas'
import { useAuth } from './useAuth'
import { PANEL_PATH_BY_ROLE } from '@/routes/panelPaths'

export default function LoginPage() {
  const { signIn, user } = useAuth()
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
  }

  if (user) return <Navigate to={PANEL_PATH_BY_ROLE[user.role]} replace />

  return (
    <div className="min-h-screen bg-skpat-bg text-skpat-text flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-skpat-oro tracking-tight text-glow">SKPAT VIP</div>
          <div className="text-skpat-muted text-sm mt-1">Panel de administración</div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-skpat-bg2 border border-skpat-border rounded-2xl p-7 space-y-5"
        >
          <h1 className="text-lg font-bold text-skpat-white">Iniciar sesión</h1>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-skpat-muted uppercase tracking-wider" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-skpat-muted" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full bg-skpat-bg3 border border-skpat-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-skpat-text placeholder:text-skpat-muted focus:outline-none focus:border-skpat-oro transition-colors"
                placeholder="tu@email.com"
              />
            </div>
            {errors.email && <p className="text-skpat-red text-xs">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-skpat-muted uppercase tracking-wider" htmlFor="password">
              Contraseña
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-skpat-muted" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="w-full bg-skpat-bg3 border border-skpat-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-skpat-text placeholder:text-skpat-muted focus:outline-none focus:border-skpat-oro transition-colors"
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="text-skpat-red text-xs">{errors.password.message}</p>}
          </div>

          {serverError && (
            <p className="text-skpat-red text-sm bg-skpat-red/8 border border-skpat-red/20 rounded-lg px-3 py-2" role="alert">
              {serverError}
            </p>
          )}

          <button
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-skpat-oro hover:bg-skpat-bronce disabled:opacity-50 py-2.5 rounded-lg font-semibold text-white transition-colors"
          >
            <LogIn size={15} />
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="flex justify-between text-xs text-skpat-muted pt-1">
            <Link to="/register" className="hover:text-skpat-oro transition-colors">
              Crear cuenta
            </Link>
            <Link to="/recover" className="hover:text-skpat-oro transition-colors">
              Olvidé mi contraseña
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
