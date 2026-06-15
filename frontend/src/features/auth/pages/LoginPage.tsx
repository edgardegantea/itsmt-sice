import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLogin } from '../hooks/useLogin'
import { useConfiguracion } from '../../../hooks/useConfiguracion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { mutate: login, isPending, error } = useLogin()
  const { config } = useConfiguracion()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login({ email, password })
  }

  const logoUrl = config.url_logo_principal ?? '/assets/img/logo/ic_imt.svg'

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — institucional */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12" style={{ backgroundColor: 'var(--color-primario)' }}>
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt={config.nombre_corto} className="h-12 w-12 object-contain" />
          <div>
            <p className="text-white text-base font-semibold tracking-wide">{config.nombre_corto}</p>
            {config.dependencia && (
              <p className="text-slate-400 text-xs mt-0.5">{config.dependencia}</p>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-white text-4xl font-semibold leading-tight">
            Sistema Integral de Control Escolar
          </h1>
          <p className="text-slate-400 text-sm mt-4 leading-relaxed">
            {config.nombre_institucion}
          </p>
          {config.subsistema && (
            <p className="text-slate-500 text-xs mt-2">{config.subsistema}</p>
          )}
        </div>

        <p className="text-slate-600 text-xs">
          {config.nombre_corto} © {new Date().getFullYear()}
          {config.clave_tecnm && <span className="ml-2">· {config.clave_tecnm}</span>}
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Logo móvil */}
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <img src={logoUrl} alt={config.nombre_corto} className="h-14 w-14 object-contain" />
            <p className="text-slate-700 text-sm font-semibold">{config.nombre_corto} — Control Escolar</p>
          </div>

          <div className="mb-8 hidden lg:block">
            <h2 className="text-2xl font-semibold text-slate-800">Iniciar sesión</h2>
            <p className="text-sm text-slate-500 mt-1">
              Personal: correo institucional · Alumnos: número de control
            </p>
          </div>

          <div className="mb-8 lg:hidden">
            <h2 className="text-xl font-semibold text-slate-800">Iniciar sesión</h2>
            <p className="text-sm text-slate-500 mt-1">Correo institucional o número de control</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Correo institucional o número de control
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="usuario@itsmt.edu.mx o 26006 0001"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c] transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                <Link to="/forgot-password" className="text-xs text-[#1a3a5c] hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c] transition"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                <span>⚠</span>
                Credenciales incorrectas. Verifica tu correo/número de control y contraseña.
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--color-primario)' }}
            >
              {isPending ? 'Verificando…' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-slate-400 space-y-1.5">
            <p>
              ¿Eres aspirante?{' '}
              <a href="/registro" className="text-[#1a3a5c] font-medium hover:underline">
                Registra tu solicitud
              </a>
            </p>
            <p>
              <a href="/aspirante/consulta" className="text-[#1a3a5c] hover:underline">
                Consulta el estatus de tu admisión
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
