import { useState, useEffect, type ReactNode } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../features/auth/services/auth'
import { useConfiguracion } from '../hooks/useConfiguracion'
import NotificationBell from '../components/NotificationBell'
import {
  IconHome,
  IconClipboard,
  IconDocument,
  IconChart,
  IconTrophy,
  IconStar,
  IconBuilding,
  IconAcademicCap,
  IconMegaphone,
  IconInbox,
  IconBanknotes,
  IconBook,
} from '../components/ui/Icons'
import { Menu, X } from 'lucide-react'

interface Props {
  children: ReactNode
}

const NAV_ITEMS = [
  { to: '/alumno/dashboard',                 label: 'Inicio',                icon: IconHome },
  { to: '/alumno/precarga-academica',        label: 'Precarga Académica',    icon: IconClipboard },
  { to: '/alumno/tramites',                  label: 'Trámites',              icon: IconDocument },
  { to: '/alumno/encuesta-socioeconomica',   label: 'Encuesta Socioecon.',   icon: IconChart },
  { to: '/alumno/actividades-complementarias', label: 'Act. Complementarias', icon: IconTrophy },
  { to: '/alumno/evaluacion-docente',        label: 'Evaluar Docentes',      icon: IconStar },
  { to: '/alumno/vinculacion',               label: 'SS y Residencia',       icon: IconBuilding },
  { to: '/alumno/titulacion',                label: 'Titulación',            icon: IconAcademicCap },
  { to: '/alumno/convocatorias',             label: 'Convocatorias',         icon: IconMegaphone },
  { to: '/alumno/mis-postulaciones',         label: 'Mis Postulaciones',     icon: IconInbox },
  { to: '/alumno/becas',                     label: 'Mis Becas',             icon: IconBanknotes },
  { to: '/biblioteca',                       label: 'Biblioteca',            icon: IconBook },
]

export default function AlumnoLayout({ children }: Props) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { config } = useConfiguracion()
  const logoUrl = config.url_logo_principal ?? null
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Auto-cerrar sidebar móvil al cambiar de ruta
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Bloqueo de scroll y soporte de tecla Escape cuando el drawer móvil está abierto
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    if (sidebarOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  const handleLogout = async () => {
    try { await authApi.logout() } finally {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }

  const initials = (user?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '?'

  const currentLabel = NAV_ITEMS.find(item => location.pathname === item.to)?.label ?? ''

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="pleca-tecnm-delgada w-full" />
        <div className="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">

          {/* Izquierda: hamburger (mobile) + logo + institución */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Menú"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            {logoUrl ? (
              <img src={logoUrl} alt={config.nombre_corto} className="h-7 w-7 object-contain shrink-0" />
            ) : (
              <div
                className="h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 border border-[#b38e5d]/40 shadow-xs"
                style={{ backgroundColor: 'var(--color-primario, #1b396a)' }}
              >
                {(config.nombre_corto ?? 'IT').slice(0, 2)}
              </div>
            )}

            <div className="hidden sm:block">
              <p className="text-[11px] font-medium text-slate-400 leading-none tracking-wide uppercase">
                {config.nombre_corto ?? 'ITSMT'}
              </p>
              <p className="text-xs font-semibold text-brand-600 leading-tight mt-0.5 tracking-tight">
                Portal del Estudiante · TecNM
              </p>
            </div>

            {/* Breadcrumb actual — solo mobile */}
            {currentLabel && (
              <span className="sm:hidden text-xs font-medium text-slate-500 truncate max-w-[140px]">
                {currentLabel}
              </span>
            )}
          </div>

          {/* Derecha: notificaciones + usuario + logout */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[180px]">
                {user?.name}
              </p>
              {user?.numero_control && (
                <p className="text-[10px] text-slate-500 font-mono leading-tight">
                  {user.numero_control}
                </p>
              )}
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ring-2 ring-[#b38e5d]/30 shadow-xs"
              style={{ backgroundColor: 'var(--color-primario, #1b396a)' }}
            >
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-500 hover:text-red-700 transition-colors px-2.5 py-1.5 rounded-md hover:bg-red-50 font-medium"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">

        {/* ── Sidebar desktop ────────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-slate-200/80 shrink-0 shadow-xs">
          {/* Info alumno */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 ring-2 ring-[#b38e5d]/40"
                style={{ backgroundColor: 'var(--color-primario, #1b396a)' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{user?.name}</p>
                {user?.numero_control && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[10px] font-mono font-medium rounded badge-tecnm-dorado">
                    {user.numero_control}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
            {NAV_ITEMS.map(({ to, label, icon: IconComponent }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-slate-100 text-brand-600 font-semibold border-l-3 border-[#b38e5d]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <IconComponent className="w-4 h-4 shrink-0 opacity-80" />
                <span className="truncate">{label}</span>
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-white z-50 flex flex-col shadow-2xl lg:hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Menú</p>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                {user?.numero_control && (
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{user.numero_control}</p>
                )}
              </div>

              <nav className="flex-1 py-2 overflow-y-auto">
                {NAV_ITEMS.map(({ to, label, icon: IconComponent }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                        isActive
                          ? 'bg-slate-50 text-brand-600 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                      }`
                    }
                  >
                    <IconComponent className="w-4 h-4 shrink-0 opacity-80" />
                    <span>{label}</span>
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
