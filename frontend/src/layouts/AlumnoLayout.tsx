import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../features/auth/services/auth'
import { useConfiguracion } from '../hooks/useConfiguracion'

interface Props {
  children: ReactNode
}

export default function AlumnoLayout({ children }: Props) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const { config } = useConfiguracion()
  const logoUrl = config.url_logo_principal ?? null

  const handleLogout = async () => {
    try { await authApi.logout() } finally {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }

  const initials = user?.name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() ?? '?'

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a3a5c] text-white">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={config.nombre_corto} className="h-8 w-8 object-contain shrink-0" />
            ) : (
              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                {(config.nombre_corto ?? 'IT').slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-white/70 leading-tight hidden sm:block">{config.nombre_corto}</p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{user?.name}</p>
                  {user?.numero_control && (
                    <p className="text-xs text-white/50 font-mono">{user.numero_control}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-white/40 font-medium tracking-wide uppercase">
              Portal del Estudiante
            </span>
            <button
              onClick={handleLogout}
              className="text-xs text-white/60 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Nav alumno */}
      <nav className="bg-white border-b border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex gap-1">
          {[
            { to: '/alumno/dashboard',                label: 'Inicio' },
            { to: '/alumno/precarga-academica',       label: 'Precarga Académica' },
            { to: '/alumno/tramites',                 label: 'Trámites' },
            { to: '/alumno/encuesta-socioeconomica',  label: 'Encuesta Socioeconómica' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${
                  isActive ? 'border-[#1a3a5c] text-[#1a3a5c]' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Contenido */}
      <main className="flex-1">
        {children}
      </main>

      <footer className="text-center text-xs text-slate-400 py-4">
        ITSMT — Sistema Integral de Control Escolar © {new Date().getFullYear()}
      </footer>
    </div>
  )
}
