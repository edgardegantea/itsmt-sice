import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../features/auth/services/auth'
import { useConfiguracion } from '../hooks/useConfiguracion'

interface Props {
  children: ReactNode
}

const NAV_ITEMS = [
  { to: '/alumno/dashboard',                 label: 'Inicio',                icon: '⌂' },
  { to: '/alumno/precarga-academica',        label: 'Precarga Académica',    icon: '📋' },
  { to: '/alumno/tramites',                  label: 'Trámites',              icon: '📄' },
  { to: '/alumno/encuesta-socioeconomica',   label: 'Encuesta Socioecon.',   icon: '📊' },
  { to: '/alumno/actividades-complementarias', label: 'Act. Complementarias', icon: '🏅' },
  { to: '/alumno/evaluacion-docente',        label: 'Evaluar Docentes',      icon: '⭐' },
  { to: '/alumno/vinculacion',               label: 'SS y Residencia',       icon: '🏢' },
  { to: '/alumno/titulacion',                label: 'Titulación',            icon: '🎓' },
  { to: '/alumno/convocatorias',             label: 'Convocatorias',         icon: '📢' },
  { to: '/alumno/mis-postulaciones',         label: 'Mis Postulaciones',     icon: '📬' },
]

export default function AlumnoLayout({ children }: Props) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { config } = useConfiguracion()
  const logoUrl = config.url_logo_principal ?? null
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    try { await authApi.logout() } finally {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }

  const initials = user?.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() ?? '?'

  const currentLabel = NAV_ITEMS.find(item => location.pathname === item.to)?.label ?? ''

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">

          {/* Izquierda: hamburger (mobile) + logo + institución */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Menú"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {logoUrl ? (
              <img src={logoUrl} alt={config.nombre_corto} className="h-7 w-7 object-contain shrink-0" />
            ) : (
              <div
                className="h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: 'var(--color-primario, #1a3a5c)' }}
              >
                {(config.nombre_corto ?? 'IT').slice(0, 2)}
              </div>
            )}

            <div className="hidden sm:block">
              <p className="text-[11px] text-slate-400 leading-none">
                {config.nombre_corto ?? 'ITSMT'}
              </p>
              <p className="text-xs font-semibold text-slate-700 leading-tight mt-0.5">
                Portal del Estudiante
              </p>
            </div>

            {/* Breadcrumb actual — solo mobile */}
            {currentLabel && (
              <span className="sm:hidden text-xs font-medium text-slate-500 truncate max-w-[140px]">
                {currentLabel}
              </span>
            )}
          </div>

          {/* Derecha: usuario + logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[180px]">
                {user?.name}
              </p>
              {user?.numero_control && (
                <p className="text-[10px] text-slate-400 font-mono leading-tight">
                  {user.numero_control}
                </p>
              )}
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: 'var(--color-primario, #1a3a5c)' }}
            >
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors px-2.5 py-1.5 rounded-md hover:bg-slate-100"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">

        {/* ── Sidebar desktop ────────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-slate-200 shrink-0">
          {/* Info alumno */}
          <div className="px-5 py-5 border-b border-slate-100">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white mb-3"
              style={{ backgroundColor: 'var(--color-primario, #1a3a5c)' }}
            >
              {initials}
            </div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</p>
            {user?.numero_control && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user.numero_control}</p>
            )}
          </div>

          {/* Nav items */}
          <nav className="flex-1 py-3 overflow-y-auto">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-5 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-slate-50 text-[#1a3a5c] font-semibold border-r-2 border-[#1a3a5c]'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Logout sidebar */}
          <div className="px-5 py-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full text-left text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* ── Sidebar mobile (drawer) ─────────────────────────────────── */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 w-64 bg-white z-50 flex flex-col shadow-xl lg:hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Menú</p>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:bg-slate-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                {user?.numero_control && (
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{user.numero_control}</p>
                )}
              </div>

              <nav className="flex-1 py-2 overflow-y-auto">
                {NAV_ITEMS.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center px-5 py-3 text-sm transition-colors ${
                        isActive
                          ? 'bg-slate-50 text-[#1a3a5c] font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>

              <div className="px-5 py-4 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cerrar sesión
                </button>
              </div>
            </aside>
          </>
        )}

        {/* ── Contenido principal ─────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full">
            {children}
          </div>

          <footer className="text-center text-[11px] text-slate-300 py-6 border-t border-slate-200 mt-8">
            {config.nombre_corto ?? 'ITSMT'} — Sistema Integral de Control Escolar © {new Date().getFullYear()}
          </footer>
        </main>
      </div>
    </div>
  )
}
