import { useState, useRef, type ReactNode } from 'react'
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../features/auth/services/auth'
import { useConfiguracion } from '../hooks/useConfiguracion'
import { usePreferenciasStore } from '../store/preferenciasStore'
import PreferenciasPanel from '../components/PreferenciasPanel'

// ── SVG icons ─────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconGraduate() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12v5c3.53 1.57 7.47 1.57 11 0v-5" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconBook() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

const ICONS: Record<string, () => React.JSX.Element> = {
  '/admin':                  IconDashboard,
  '/admin/aspirantes':       IconUsers,
  '/admin/alumnos':          IconGraduate,
  '/admin/periodos':         IconCalendar,
  '/admin/carreras':         IconBook,
  '/admin/catalogos':           IconTag,
  '/admin/configuracion':       IconSettings,
  '/admin/reinscripciones':              IconCalendar,
  '/admin/constancias':                  IconBook,
  '/admin/encuestas-socioeconomicas':    IconBook,
  '/admin/directorio':                    IconUsers,
  '/admin/usuarios':                     IconUsers,
  '/admin/permisos':                     IconShield,
  '/admin/gestion-academica':            IconGraduate,
  '/admin/carga-academica':              IconGraduate,
  '/docente/planeacion':                 IconBook,
}

type NavItem = { to: string; label: string; roles?: string[] }
type NavGroup = { id: string; label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'general',
    label: '',
    items: [
      { to: '/admin', label: 'Panel', roles: ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'personal_administrativo'] },
    ],
  },
  {
    id: 'aspirantes',
    label: 'Aspirantes',
    items: [
      { to: '/admin/aspirantes', label: 'Aspirantes', roles: ['superadmin', 'admin', 'jefe_carrera', 'personal_administrativo'] },
    ],
  },
  {
    id: 'estudiantes',
    label: 'Estudiantes',
    items: [
      { to: '/admin/alumnos',                   label: 'Alumnos',             roles: ['superadmin', 'admin', 'director_academico', 'jefe_carrera', 'personal_administrativo'] },
      { to: '/admin/reinscripciones',           label: 'Reinscripciones',     roles: ['superadmin', 'admin', 'personal_administrativo', 'jefe_carrera'] },
      { to: '/admin/constancias',               label: 'Constancias',         roles: ['superadmin', 'admin', 'personal_administrativo'] },
      { to: '/admin/encuestas-socioeconomicas', label: 'Enc. Socioeconómica', roles: ['superadmin', 'admin', 'personal_administrativo', 'director_academico', 'jefe_carrera'] },
      { to: '/admin/carga-academica',           label: 'Carga Académica PDF', roles: ['superadmin', 'admin', 'personal_administrativo', 'jefe_carrera'] },
    ],
  },
  {
    id: 'personal',
    label: 'Personal',
    items: [
      { to: '/admin/gestion-academica', label: 'Gestión Académica', roles: ['superadmin', 'admin', 'director_academico', 'jefe_carrera'] },
      { to: '/docente/planeacion',      label: 'Mi Planeación',     roles: ['docente', 'jefe_carrera'] },
      { to: '/admin/directorio',        label: 'Directorio',        roles: ['superadmin'] },
      { to: '/admin/usuarios',          label: 'Usuarios',          roles: ['superadmin', 'admin'] },
      { to: '/admin/permisos',          label: 'Permisos',          roles: ['superadmin'] },
      { to: '/admin/periodos',          label: 'Periodos',          roles: ['superadmin', 'admin'] },
      { to: '/admin/carreras',          label: 'Carreras',          roles: ['superadmin', 'admin', 'director_academico'] },
      { to: '/admin/catalogos',         label: 'Catálogos',         roles: ['superadmin', 'admin'] },
      { to: '/admin/configuracion',     label: 'Configuración',     roles: ['superadmin', 'admin'] },
    ],
  },
]

// ── NavItem con tooltip fixed ─────────────────────────────────────────────────

function NavItem({ n, colapsado, onClose }: { n: { to: string; label: string }; colapsado: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ top: number } | null>(null)
  const Icon = ICONS[n.to] ?? IconTag

  const showTip = () => {
    if (!colapsado || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setTip({ top: rect.top + rect.height / 2 })
  }

  return (
    <div ref={ref} onMouseEnter={showTip} onMouseLeave={() => setTip(null)}>
      <NavLink
        to={n.to}
        end={n.to === '/admin'}
        onClick={onClose}
        className={({ isActive }) =>
          `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
            colapsado ? 'justify-center' : ''
          } ${
            isActive
              ? 'bg-white/10 text-white font-medium'
              : 'text-slate-400 hover:bg-white/10 hover:text-slate-100'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300 transition-colors'}`}>
              <Icon />
            </span>
            {!colapsado && <span className="truncate">{n.label}</span>}
            {!colapsado && isActive && (
              <span className="ml-auto w-1 h-4 rounded-full bg-white/70 shrink-0" />
            )}
          </>
        )}
      </NavLink>

      {/* Tooltip fixed — escapa cualquier overflow */}
      {colapsado && tip && (
        <div
          className="fixed left-[4.5rem] z-[9999] pointer-events-none
            whitespace-nowrap rounded-md px-2.5 py-1.5
            bg-slate-900 text-white text-xs font-medium shadow-lg"
          style={{ top: tip.top, transform: 'translateY(-50%)' }}
        >
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
          {n.label}
        </div>
      )}
    </div>
  )
}

// ── Breadcrumbs ───────────────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  admin:                        'Panel',
  aspirantes:                   'Aspirantes',
  alumnos:                      'Alumnos',
  'gestion-academica':          'Gestión Académica',
  'carga-academica':            'Carga Académica PDF',
  planeacion:                   'Mi Planeación',
  reinscripciones:              'Reinscripciones',
  constancias:                  'Constancias',
  'encuestas-socioeconomicas':  'Enc. Socioeconómica',
  periodos:                     'Periodos',
  carreras:                     'Carreras',
  catalogos:                    'Catálogos',
  directorio:                   'Directorio',
  usuarios:                     'Usuarios',
  permisos:                     'Permisos',
  configuracion:                'Configuración',
  docente:                      'Docente',
}

function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.replace(/^\//, '').split('/')

  // Construye las migas acumulando el path
  const crumbs: { label: string; path: string }[] = []
  let accumulated = ''
  for (const seg of segments) {
    accumulated += '/' + seg
    const label = ROUTE_LABELS[seg]
    if (!label) {
      // Segmento dinámico (id) — lo omitimos si el anterior ya está
      if (crumbs.length) crumbs[crumbs.length - 1].label += ' — Detalle'
      continue
    }
    crumbs.push({ label, path: accumulated })
  }

  if (crumbs.length <= 1) return null

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 px-6 py-2.5 border-b border-slate-100 bg-white text-xs text-slate-400">
      {crumbs.map((c, i) => (
        <span key={c.path} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300">/</span>}
          {i === crumbs.length - 1
            ? <span className="text-slate-600 font-medium">{c.label}</span>
            : <Link to={c.path} className="hover:text-slate-700 transition-colors">{c.label}</Link>
          }
        </span>
      ))}
    </nav>
  )
}

// ── Role labels ───────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  superadmin:              'Superadministrador',
  admin:                   'Administrador',
  director_academico:      'Director Académico',
  jefe_carrera:            'Jefe de Carrera',
  docente:                 'Docente',
  alumno:                  'Alumno',
  personal_administrativo: 'Personal Administrativo',
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)

  const { sidebarColapsado, set: setPrefs } = usePreferenciasStore()
  const [colapsado, setColapsadoLocal] = useState(sidebarColapsado)

  const setColapsado = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(colapsado) : v
    setColapsadoLocal(next)
    setPrefs({ sidebarColapsado: next })
  }

  const handleLogout = async () => {
    try { await authApi.logout() } finally {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }

  const navGroups = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(n => !n.roles || n.roles.some(r => user?.roles.includes(r))) }))
    .filter(g => g.items.length > 0)

  const initials = user?.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() ?? '?'

  const roleLabel = user?.roles[0] ? (ROLE_LABEL[user.roles[0]] ?? user.roles[0]) : ''
  const { config } = useConfiguracion()

  const logoUrl = config.url_logo_principal ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Overlay móvil ── */}
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex flex-col shrink-0
          transform transition-all duration-200 ease-in-out
          ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:inset-auto md:z-auto md:translate-x-0
          ${colapsado ? 'md:w-16' : 'md:w-56'}
          w-56
        `}
        style={{ backgroundColor: 'var(--color-sidebar-user, var(--color-primario))' }}
      >
        {/* Botón flotante colapsar — solo desktop */}
        <button
          onClick={() => setColapsado(c => !c)}
          className="hidden md:flex absolute -right-3 top-[4.5rem] z-40 w-6 h-6 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-slate-800 hover:shadow-lg transition-all duration-150"
          aria-label={colapsado ? 'Expandir menú' : 'Contraer menú'}
        >
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${colapsado ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {/* Logo / Marca */}
        <div className={`pt-5 pb-4 flex items-center gap-3 shrink-0 ${colapsado ? 'px-4 justify-center' : 'px-5 justify-between'}`}>
          <div className={`flex items-center gap-2.5 min-w-0 ${colapsado ? 'justify-center' : ''}`}>
            {logoUrl ? (
              <img src={logoUrl} alt={config.nombre_corto} className="h-8 w-8 object-contain shrink-0" />
            ) : (
              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                {(config.nombre_corto ?? 'IT').slice(0, 2)}
              </div>
            )}
            {!colapsado && (
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold tracking-wide truncate">{config.nombre_corto}</p>
                <p className="text-slate-400 text-[10px] leading-tight truncate">Control Escolar</p>
              </div>
            )}
          </div>
          {/* Cerrar en móvil */}
          <button
            className={`md:hidden text-slate-400 hover:text-white transition-colors p-1 ${colapsado ? 'hidden' : ''}`}
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/8 shrink-0" />

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
          {navGroups.map((g) => (
            <div key={g.id}>
              {g.label && !colapsado && (
                <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest uppercase text-slate-500 select-none">
                  {g.label}
                </p>
              )}
              {g.label && colapsado && (
                <div className="mx-3 mb-1 h-px bg-white/10" />
              )}
              <div className="space-y-0.5">
                {g.items.map((n) => (
                  <NavItem key={n.to} n={n} colapsado={colapsado} onClose={() => setMenuAbierto(false)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/8 shrink-0" />

        {/* User + colapsar */}
        <div className={`py-4 shrink-0 ${colapsado ? 'px-2' : 'px-4'}`}>
          {!colapsado && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ring-2 ring-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-200 truncate leading-tight">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-tight">{roleLabel}</p>
                {user?.roles.includes('jefe_carrera') && user.carrera && typeof user.carrera === 'object' && (
                  <p className="text-[10px] text-blue-300 truncate mt-0.5 leading-tight font-medium">
                    {user.carrera.clave} — {user.carrera.nombre}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="relative group/logout mb-2">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-2 text-xs text-slate-400 hover:text-slate-100 bg-white/5 hover:bg-white/10 rounded-lg py-2.5 transition-all duration-150 ${colapsado ? 'justify-center px-0' : 'justify-center'}`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
              </svg>
              {!colapsado && 'Cerrar sesión'}
            </button>
            {colapsado && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                whitespace-nowrap rounded-md px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium shadow-lg
                opacity-0 scale-95 group-hover/logout:opacity-100 group-hover/logout:scale-100
                transition-all duration-150">
                Cerrar sesión
                <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
              </div>
            )}
          </div>

          {/* Preferencias — solo superadmin */}
          <div className={`relative group/prefs ${user?.roles.includes('superadmin') ? '' : 'hidden'}`}>
            <button
              onClick={() => setPrefsOpen(p => !p)}
              className={`flex w-full items-center gap-2 text-xs text-slate-500 hover:text-slate-300 rounded-lg py-2 px-2 transition-colors ${colapsado ? 'justify-center' : ''}`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              {!colapsado && 'Preferencias'}
            </button>
            {colapsado && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                whitespace-nowrap rounded-md px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium shadow-lg
                opacity-0 scale-95 group-hover/prefs:opacity-100 group-hover/prefs:scale-100
                transition-all duration-150">
                Preferencias
                <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
              </div>
            )}
          </div>
        </div>

        {/* Panel de preferencias */}
        <PreferenciasPanel open={prefsOpen} onClose={() => setPrefsOpen(false)} />
      </aside>

      {/* ── Contenido principal ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar móvil */}
        <header className="md:hidden sticky top-0 z-10 border-b border-white/8 px-4 py-3 flex items-center gap-3 shrink-0" style={{ backgroundColor: 'var(--color-sidebar-user, var(--color-primario))' }}>
          <button
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-white tracking-wider">SICE</span>
        </header>

        <Breadcrumbs />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
