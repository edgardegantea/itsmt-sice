import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../services/auth'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [password, setPassword]             = useState('')
  const [passwordConf, setPasswordConf]     = useState('')
  const [localError, setLocalError]         = useState('')

  const { mutate, isPending, error, isSuccess } = useMutation({
    mutationFn: () => authApi.resetPassword({
      token,
      email,
      password,
      password_confirmation: passwordConf,
    }),
    onSuccess: () => {
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    if (password !== passwordConf) {
      setLocalError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setLocalError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    mutate()
  }

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center max-w-sm">
          <p className="text-slate-700 font-medium mb-2">Enlace inválido o expirado</p>
          <p className="text-sm text-slate-500 mb-6">
            El enlace de recuperación no es válido o ya fue utilizado. Solicita uno nuevo.
          </p>
          <Link to="/forgot-password" className="text-sm text-[#1a3a5c] hover:underline font-medium">
            Solicitar nuevo enlace →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo */}
      <div className="hidden lg:flex w-1/2 bg-[#1a3a5c] flex-col justify-between p-12">
        <div />
        <div>
          <h1 className="text-white text-4xl font-semibold leading-tight">
            Sistema Integral de Control Escolar
          </h1>
          <p className="text-white/50 text-sm mt-4">
            Instituto Tecnológico Superior de Martínez de la Torre
          </p>
        </div>
        <p className="text-white/25 text-xs">ITSMT © {new Date().getFullYear()}</p>
      </div>

      {/* Panel derecho */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-800">Nueva contraseña</h2>
            <p className="text-sm text-slate-500 mt-1 font-mono truncate">{email}</p>
          </div>

          {isSuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-sm text-green-800">
              <p className="font-medium mb-1">Contraseña actualizada</p>
              <p className="text-green-700">
                Tu contraseña fue cambiada correctamente. Redirigiendo al inicio de sesión…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c] transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={passwordConf}
                  onChange={e => setPasswordConf(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Repite la contraseña"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c] transition"
                />
              </div>

              {(localError || error) && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                  {localError || 'El enlace expiró o es inválido. Solicita uno nuevo.'}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {isPending ? 'Guardando…' : 'Cambiar contraseña'}
              </button>

              <p className="text-center text-xs text-slate-400">
                <Link to="/login" className="text-[#1a3a5c] hover:underline">
                  ← Volver al inicio de sesión
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
