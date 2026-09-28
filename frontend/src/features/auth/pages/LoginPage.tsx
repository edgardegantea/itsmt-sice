import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLogin } from '../hooks/useLogin'
import { useConfiguracion } from '../../../hooks/useConfiguracion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [codigo, setCodigo] = useState('')
  const { login, verificar2fa, challengeToken, cancelar2fa } = useLogin()
  const { config } = useConfiguracion()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login.mutate({ email, password })
  }

  const handleVerificar2fa = (e: React.FormEvent) => {
    e.preventDefault()
    verificar2fa.mutate(codigo)
  }

  const logoUrl  = config.url_logo_principal ?? null
  const fondoUrl = config.url_login_imagen_fondo ?? null
  const opacidad = config.login_opacidad_fondo ?? 0.70
  const loginTitulo    = config.login_titulo || 'Sistema Integral de Control Escolar'
  const loginSubtitulo = config.login_subtitulo || config.nombre_institucion

  return (
    <div className="min-h-screen flex relative">
      {/* Pleca institucional superior */}
      <div className="pleca-tecnm absolute top-0 left-0 right-0 h-1.5 z-30" />

      {/* Panel izquierdo — institucional */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative bg-cover bg-center"
        style={{
          backgroundColor: 'var(--color-primario, #1b396a)',
          ...(fondoUrl ? { backgroundImage: `url(${fondoUrl})` } : {}),
        }}
      >
        {/* Capa de color con opacidad configurable sobre la imagen de fondo */}
        {fondoUrl && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'var(--color-primario, #1b396a)', opacity: opacidad }}
          />
        )}
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={config.nombre_corto} className="h-12 w-12 object-contain" />
            ) : (
              <div className="h-12 w-12 rounded-xl flex items-center justify-center text-sm font-bold text-white border border-[#b38e5d]/40 shadow-sm" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                {(config.nombre_corto ?? 'IT').slice(0, 2)}
              </div>
            )}
            <div>
              <p className="text-white text-base font-semibold tracking-wide font-['Montserrat']">{config.nombre_corto}</p>
              <p className="text-[#d4c19c] text-xs font-medium mt-0.5">{config.dependencia || 'Tecnológico Nacional de México'}</p>
            </div>
          </div>

          <div className="py-8">
            <div className="inline-block w-12 h-1 bg-[#b38e5d] rounded-full mb-6" />
            <h1 className="text-white text-4xl font-bold leading-tight font-['Montserrat']">
              {loginTitulo}
            </h1>
            {loginSubtitulo && (
              <p className="text-slate-200 text-sm mt-4 leading-relaxed font-light">
                {loginSubtitulo}
              </p>
            )}
            <p className="text-[#d4c19c] text-xs mt-4 font-semibold italic tracking-wide">
              «Excelencia en Educación Tecnológica®»
            </p>
            {config.subsistema && (
              <p className="text-slate-300/80 text-[11px] mt-2 font-medium">{config.subsistema}</p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-300/80">
            <p>
              {config.nombre_corto} © {new Date().getFullYear()}
              {config.clave_tecnm && <span className="ml-2">· Clave: {config.clave_tecnm}</span>}
            </p>
            <span className="text-[#b38e5d] font-semibold tracking-wider">TECNM</span>
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#f8fafc]">
        <div className="w-full max-w-sm">
          {/* Logo móvil */}
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={config.nombre_corto} className="h-14 w-14 object-contain" />
            ) : (
              <div className="h-14 w-14 rounded-xl flex items-center justify-center text-base font-bold shadow-md border border-[#b38e5d]/30" style={{ backgroundColor: 'var(--color-primario, #1b396a)', color: 'white' }}>
                {(config.nombre_corto ?? 'IT').slice(0, 2)}
              </div>
            )}
            <div className="text-center">
              <p className="text-slate-800 text-base font-bold font-['Montserrat']">{config.nombre_corto} — Control Escolar</p>
              <p className="text-xs text-[#b38e5d] font-medium mt-0.5">Tecnológico Nacional de México</p>
            </div>
          </div>

          <div className="mb-8 hidden lg:block">
            <h2 className="text-2xl font-bold text-slate-800 font-['Montserrat']">Iniciar sesión</h2>
            <p className="text-sm text-slate-500 mt-1">
              Personal: correo institucional · Alumnos: número de control
            </p>
          </div>

          <div className="mb-8 lg:hidden">
            <h2 className="text-xl font-bold text-slate-800 font-['Montserrat']">Iniciar sesión</h2>
            <p className="text-sm text-slate-500 mt-1">Correo institucional o número de control</p>
          </div>

          {!challengeToken ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Correo o Número de control
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="ejemplo@itsmt.edu.mx o 200C0001"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                  <Link to="/forgot-password" className="text-xs text-brand-600 hover:text-[#8b1d41] hover:underline font-medium">
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
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition bg-white"
                />
              </div>

              {login.error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                  <span>⚠</span>
                  Credenciales incorrectas. Verifica tu correo/número de control y contraseña.
                </div>
              )}

              <button
                type="submit"
                disabled={login.isPending}
                className="w-full disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition-all duration-150 shadow-sm hover:shadow-md cursor-pointer"
                style={{ backgroundColor: 'var(--color-primario, #1b396a)' }}
              >
                {login.isPending ? 'Verificando…' : 'Ingresar al sistema'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerificar2fa} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Código de verificación en dos pasos
                </label>
                <p className="text-xs text-slate-500 mb-2">Ingresa el código de 6 dígitos de tu aplicación de autenticación, o un código de recuperación.</p>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition tracking-widest text-center bg-white"
                />
              </div>

              {verificar2fa.error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                  <span>⚠</span>
                  Código inválido o expirado.
                </div>
              )}

              <button
                type="submit"
                disabled={verificar2fa.isPending}
                className="w-full disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition-all duration-150 shadow-sm"
                style={{ backgroundColor: 'var(--color-primario, #1b396a)' }}
              >
                {verificar2fa.isPending ? 'Verificando…' : 'Verificar'}
              </button>

              <button type="button" onClick={cancelar2fa} className="w-full text-xs text-slate-500 hover:underline">
                Volver al inicio de sesión
              </button>
            </form>
          )}

          <div className="mt-8 text-center text-xs text-slate-400 space-y-2 border-t border-slate-200 pt-5">
            <p>
              ¿Eres aspirante?{' '}
              <a href="/registro" className="text-brand-600 font-semibold hover:text-[#8b1d41] hover:underline">
                Registra tu solicitud
              </a>
            </p>
            <p>
              <a href="/aspirante/consulta" className="text-slate-600 hover:text-brand-600 hover:underline">
                Consulta el estatus de tu admisión
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
