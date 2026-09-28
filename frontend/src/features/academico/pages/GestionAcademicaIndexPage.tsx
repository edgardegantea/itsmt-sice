import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users, BookOpen, LayoutGrid, UsersRound, DoorOpen, ClipboardList, AlertTriangle, RadioTower,
  Trophy, HeartPulse, ShieldCheck, UserX, Wrench, ListChecks, CalendarRange, CalendarClock,
  SearchCheck, Stethoscope, NotebookPen, HeartHandshake, BadgeCheck, IdCard, CalendarCheck, PenLine,
  Search, Star, X, LayoutList, Rows3, ArrowRight, Bell, type LucideIcon,
} from 'lucide-react'
import apiClient from '../../../config/apiClient'

// ── Catálogo de secciones ─────────────────────────────────────────────────────

type CategoriaId = 'estructura' | 'horarios' | 'seguimiento' | 'monitoreo'

const CATEGORIAS: { id: CategoriaId; label: string }[] = [
  { id: 'estructura',  label: 'Estructura académica' },
  { id: 'horarios',    label: 'Cargas y horarios' },
  { id: 'seguimiento', label: 'Seguimiento docente' },
  { id: 'monitoreo',   label: 'Monitoreo y alertas' },
]

type AvisoId = 'mantenimiento' | 'riesgo' | 'desercion' | 'incidencias'

interface Seccion {
  titulo: string
  descripcion: string
  ruta: string
  icono: LucideIcon
  categoria: CategoriaId
  /** Contador de pendientes que se muestra como aviso en la sección. */
  aviso?: AvisoId
}

const SECCIONES: Seccion[] = [
  { titulo: 'Docentes', descripcion: 'Gestiona los datos institucionales del personal docente: clave, nombramiento, tipo de horas y horario.', ruta: '/admin/gestion-academica/docentes', icono: Users, categoria: 'estructura' },
  { titulo: 'Materias', descripcion: 'Administra el catálogo de materias por carrera, semestre y tipo.', ruta: '/admin/gestion-academica/materias', icono: BookOpen, categoria: 'estructura' },
  { titulo: 'Malla Curricular', descripcion: 'Define qué materias pertenecen a cada semestre de cada carrera.', ruta: '/admin/gestion-academica/malla', icono: LayoutGrid, categoria: 'estructura' },
  { titulo: 'Grupos', descripcion: 'Gestiona grupos escolares, asigna alumnos y consulta detalles.', ruta: '/admin/gestion-academica/grupos', icono: UsersRound, categoria: 'estructura' },
  { titulo: 'Aulas', descripcion: 'Administra los espacios físicos disponibles: salones, labs y talleres.', ruta: '/admin/gestion-academica/aulas', icono: DoorOpen, categoria: 'estructura' },
  { titulo: 'Fichas Docentes', descripcion: 'Gestiona contrato, categoría, especialidades y carga histórica de cada docente.', ruta: '/admin/gestion-academica/fichas-docentes', icono: IdCard, categoria: 'estructura' },
  { titulo: 'Funciones del Personal', descripcion: 'Registra las funciones y roles del personal académico.', ruta: '/admin/gestion-academica/funciones', icono: BadgeCheck, categoria: 'estructura' },

  { titulo: 'Cargas Académicas', descripcion: 'Asigna docentes a materias y grupos para el periodo activo.', ruta: '/admin/gestion-academica/cargas', icono: ListChecks, categoria: 'horarios' },
  { titulo: 'Constructor de Horarios', descripcion: 'Arma el horario de cada grupo asignando materias, docentes y aulas en la rejilla.', ruta: '/admin/gestion-academica/cargas/builder', icono: CalendarRange, categoria: 'horarios' },
  { titulo: 'Disponibilidad Docente', descripcion: 'Consulta y administra los bloques de disponibilidad declarados por los docentes.', ruta: '/admin/horarios/disponibilidad', icono: CalendarClock, categoria: 'horarios' },
  { titulo: 'Buscador de Disponibilidad', descripcion: 'Dado un grupo y una materia, encuentra automáticamente día/hora/docente/aula libres.', ruta: '/admin/gestion-academica/horarios/buscar', icono: SearchCheck, categoria: 'horarios' },
  { titulo: 'Diagnóstico de Horarios', descripcion: 'Audita traslapes de docente, aula o grupo que se hayan colado fuera del constructor.', ruta: '/admin/gestion-academica/horarios/diagnostico', icono: Stethoscope, categoria: 'horarios' },

  { titulo: 'Planeaciones', descripcion: 'Revisa y gestiona las planeaciones didácticas de los docentes.', ruta: '/admin/gestion-academica/planeaciones', icono: NotebookPen, categoria: 'seguimiento' },
  { titulo: 'Asistencias', descripcion: 'Registra sesiones de clase y controla la asistencia de alumnos por sesión.', ruta: '/admin/gestion-academica/asistencias', icono: CalendarCheck, categoria: 'seguimiento' },
  { titulo: 'Captura de Calificaciones', descripcion: 'Los docentes capturan las calificaciones de sus materias asignadas; directivos pueden revisar cualquier grupo.', ruta: '/admin/gestion-academica/calificaciones', icono: PenLine, categoria: 'seguimiento' },
  { titulo: 'Tutorías', descripcion: 'Administra la asignación de tutores a alumnos por periodo.', ruta: '/admin/gestion-academica/tutorias', icono: HeartHandshake, categoria: 'seguimiento' },
  { titulo: 'Ranking Docente', descripcion: 'Cumplimiento de captura, asistencia e incidencias por docente, con insignias y reconocimiento público.', ruta: '/admin/gestion-academica/ranking-docentes', icono: Trophy, categoria: 'seguimiento' },

  { titulo: 'Incidencias de Clase', descripcion: 'Bitácora de rondas de prefectura: verifica docente, alumnos, grupo y aula contra el horario.', ruta: '/admin/gestion-academica/incidencias-clase', icono: ClipboardList, categoria: 'monitoreo', aviso: 'incidencias' },
  { titulo: 'Torre de Control', descripcion: 'Estado en vivo del campus: qué aulas están ocupadas, incidencias e inasistencia registrada hoy.', ruta: '/admin/gestion-academica/torre-control', icono: RadioTower, categoria: 'monitoreo', aviso: 'incidencias' },
  { titulo: 'Riesgo Académico', descripcion: 'Alerta temprana: cruza reprobación, inasistencia e incidencias para detectar alumnos en riesgo de baja.', ruta: '/admin/gestion-academica/riesgo-academico', icono: AlertTriangle, categoria: 'monitoreo', aviso: 'riesgo' },
  { titulo: 'Deserción Temprana', descripcion: 'Detecta abandono desde las primeras semanas usando el patrón de asistencia, antes de que existan calificaciones.', ruta: '/admin/gestion-academica/desercion-temprana', icono: UserX, categoria: 'monitoreo', aviso: 'desercion' },
  { titulo: 'Salud del Semestre', descripcion: 'Índice combinado por carrera (académico + ocupación + docente + incidencias) con tendencia semanal.', ruta: '/admin/gestion-academica/salud-semestral', icono: HeartPulse, categoria: 'monitoreo' },
  { titulo: 'Mantenimiento de Aulas', descripcion: 'Tickets generados desde la ronda de prefectura cuando reportan un problema físico del espacio.', ruta: '/admin/gestion-academica/mantenimiento-aulas', icono: Wrench, categoria: 'monitoreo', aviso: 'mantenimiento' },
  { titulo: 'Modo Día de Examen', descripcion: 'Activa verificación reforzada (foto + ubicación obligatorias) en el check-in solo para una fecha.', ruta: '/admin/gestion-academica/modos-examen', icono: ShieldCheck, categoria: 'monitoreo' },
]

const AVISO_TEXTO: Record<AvisoId, (n: number) => string> = {
  mantenimiento: n => `${n} ticket${n === 1 ? '' : 's'} abierto${n === 1 ? '' : 's'}`,
  riesgo:        n => `${n} alumno${n === 1 ? '' : 's'} en riesgo alto`,
  desercion:     n => `${n} alumno${n === 1 ? '' : 's'} con riesgo alto de deserción`,
  incidencias:   n => `${n} incidencia${n === 1 ? '' : 's'} con novedad hoy`,
}

// ── Preferencias locales (favoritos, vista, orden, uso) ───────────────────────
// localStorage puede no estar disponible (navegación privada, políticas); todo acceso
// va protegido y la página funciona igual sin él.

type Vista = 'tarjetas' | 'lista' | 'compacta'
type Orden = 'categoria' | 'alfabetico' | 'avisos' | 'uso'

function leer<T>(clave: string, porDefecto: T): T {
  try {
    const v = localStorage.getItem(clave)
    return v ? (JSON.parse(v) as T) : porDefecto
  } catch { return porDefecto }
}
function guardar(clave: string, valor: unknown) {
  try { localStorage.setItem(clave, JSON.stringify(valor)) } catch { /* sin almacenamiento */ }
}

function usePreferencia<T>(clave: string, porDefecto: T) {
  const [valor, setValor] = useState<T>(() => leer(clave, porDefecto))
  useEffect(() => { guardar(clave, valor) }, [clave, valor])
  return [valor, setValor] as const
}

// ── Avisos (contadores de pendientes) ─────────────────────────────────────────

function useAvisos(): Partial<Record<AvisoId, number>> {
  // Un solo endpoint con los cuatro conteos, calculados y cacheados en el servidor
  // (antes eran cuatro peticiones que traían listas completas solo para contarlas).
  // Si el usuario no tiene permiso para alguno, ese llega como null y no se muestra.
  const { data } = useQuery({
    queryKey: ['ga-avisos'],
    queryFn: () => apiClient.get('/gestion-academica/avisos')
      .then(r => r.data.data as Record<AvisoId, number | null>),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  return {
    mantenimiento: data?.mantenimiento ?? undefined,
    riesgo: data?.riesgo ?? undefined,
    desercion: data?.desercion ?? undefined,
    incidencias: data?.incidencias ?? undefined,
  }
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function GestionAcademicaIndexPage() {
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = usePreferencia<Vista>('ga-vista', 'tarjetas')
  const [orden, setOrden] = usePreferencia<Orden>('ga-orden', 'categoria')
  const [favoritos, setFavoritos] = usePreferencia<string[]>('ga-favoritos', [])
  const [usos, setUsos] = usePreferencia<Record<string, number>>('ga-usos', {})
  const buscadorRef = useRef<HTMLInputElement>(null)
  const avisos = useAvisos()

  // "/" enfoca el buscador (como en GitHub o Gmail), Esc lo limpia.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault()
        buscadorRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const conteo = (s: Seccion) => (s.aviso ? avisos[s.aviso] ?? 0 : 0)
  const toggleFavorito = (ruta: string) =>
    setFavoritos(f => (f.includes(ruta) ? f.filter(r => r !== ruta) : [...f, ruta]))
  const registrarUso = (ruta: string) => setUsos(u => ({ ...u, [ruta]: (u[ruta] ?? 0) + 1 }))

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    const catLabel = (id: CategoriaId) => CATEGORIAS.find(c => c.id === id)?.label ?? ''
    const lista = q
      ? SECCIONES.filter(s => norm(`${s.titulo} ${s.descripcion} ${catLabel(s.categoria)}`).includes(q))
      : [...SECCIONES]

    const porNombre = (a: Seccion, b: Seccion) => a.titulo.localeCompare(b.titulo, 'es')
    if (orden === 'alfabetico') lista.sort(porNombre)
    if (orden === 'avisos') lista.sort((a, b) => conteo(b) - conteo(a) || porNombre(a, b))
    if (orden === 'uso') lista.sort((a, b) => (usos[b.ruta] ?? 0) - (usos[a.ruta] ?? 0) || porNombre(a, b))
    return lista
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, orden, usos, avisos.mantenimiento, avisos.riesgo, avisos.desercion, avisos.incidencias])

  const favoritas = filtradas.filter(s => favoritos.includes(s.ruta))
  const resto = filtradas.filter(s => !favoritos.includes(s.ruta))

  // Por categoría se agrupan en bloques; en los demás órdenes es una sola lista.
  const grupos: { id: string; label: string; items: Seccion[] }[] = orden === 'categoria'
    ? CATEGORIAS.map(c => ({ id: c.id, label: c.label, items: resto.filter(s => s.categoria === c.id) })).filter(g => g.items.length)
    : resto.length ? [{ id: 'todas', label: favoritas.length ? 'Todas las secciones' : '', items: resto }] : []

  const totalAvisos = SECCIONES.reduce((n, s) => n + conteo(s), 0)

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6">
      <div className="space-y-5">
        {/* Encabezado */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión Académica</h1>
            <p className="text-slate-500 text-sm mt-1">
              {SECCIONES.length} secciones
              {totalAvisos > 0 && (
                <> · <span className="text-amber-700 font-medium">{totalAvisos} pendiente{totalAvisos === 1 ? '' : 's'} por atender</span></>
              )}
            </p>
          </div>
        </div>

        {/* Barra de herramientas */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              ref={buscadorRef}
              type="search"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setBusqueda('') }}
              placeholder="Buscar sección, por ejemplo “horarios” o “riesgo”…"
              aria-label="Buscar sección"
              className="w-full pl-9 pr-16 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/20 focus:border-[var(--color-primario)]"
            />
            {busqueda ? (
              <button type="button" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            ) : (
              <kbd className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">/</kbd>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Ordenar
              <select value={orden} onChange={e => setOrden(e.target.value as Orden)}
                className="text-sm text-slate-700 border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]/20">
                <option value="categoria">Por categoría</option>
                <option value="alfabetico">Alfabético (A–Z)</option>
                <option value="avisos">Pendientes primero</option>
                <option value="uso">Más usados</option>
              </select>
            </label>

            <div className="inline-flex rounded-lg border border-slate-200 bg-white overflow-hidden" role="group" aria-label="Estilo de vista">
              {([
                ['tarjetas', LayoutGrid, 'Tarjetas'],
                ['lista', LayoutList, 'Lista'],
                ['compacta', Rows3, 'Compacta'],
              ] as const).map(([id, Icono, label], i) => (
                <button key={id} type="button" onClick={() => setVista(id)} aria-pressed={vista === id} title={label}
                  className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${i ? 'border-l border-slate-200' : ''} ${
                    vista === id ? 'bg-[var(--color-primario)] text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}>
                  <Icono className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Resultados */}
        {filtradas.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-white">
            <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-slate-600">No hay secciones que coincidan con “{busqueda}”.</p>
            <button type="button" onClick={() => setBusqueda('')} className="mt-2 text-sm font-medium text-[var(--color-primario)] hover:underline">
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {favoritas.length > 0 && (
              <Bloque titulo="Favoritos" icono={<Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />}>
                <Items items={favoritas} vista={vista} favoritos={favoritos} onFavorito={toggleFavorito} onUso={registrarUso} conteo={conteo} />
              </Bloque>
            )}
            {grupos.map(g => (
              <Bloque key={g.id} titulo={g.label}>
                <Items items={g.items} vista={vista} favoritos={favoritos} onFavorito={toggleFavorito} onUso={registrarUso} conteo={conteo} />
              </Bloque>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componentes de presentación ───────────────────────────────────────────────

function Bloque({ titulo, icono, children }: { titulo: string; icono?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      {titulo && (
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
          {icono}{titulo}
        </h2>
      )}
      {children}
    </section>
  )
}

interface ItemsProps {
  items: Seccion[]
  vista: Vista
  favoritos: string[]
  onFavorito: (ruta: string) => void
  onUso: (ruta: string) => void
  conteo: (s: Seccion) => number
}

function BotonFavorito({ activo, onClick, titulo }: { activo: boolean; onClick: () => void; titulo: string }) {
  return (
    <button
      type="button"
      onClick={e => { e.preventDefault(); e.stopPropagation(); onClick() }}
      aria-pressed={activo}
      aria-label={activo ? `Quitar ${titulo} de favoritos` : `Marcar ${titulo} como favorito`}
      title={activo ? 'Quitar de favoritos' : 'Marcar como favorito'}
      className={`p-1.5 rounded-md transition-colors shrink-0 ${activo ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'}`}
    >
      <Star className={`w-4 h-4 ${activo ? 'fill-amber-400' : ''}`} strokeWidth={1.75} />
    </button>
  )
}

function Aviso({ seccion, n, compacto = false }: { seccion: Seccion; n: number; compacto?: boolean }) {
  if (!seccion.aviso || n <= 0) return null
  const texto = AVISO_TEXTO[seccion.aviso](n)
  return compacto ? (
    <span title={texto} className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center shrink-0">
      {n > 99 ? '99+' : n}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
      <Bell className="w-3 h-3" aria-hidden="true" />{texto}
    </span>
  )
}

function Items({ items, vista, favoritos, onFavorito, onUso, conteo }: ItemsProps) {
  if (vista === 'lista') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
        {items.map(s => {
          const Icono = s.icono
          return (
            <Link key={s.ruta} to={s.ruta} onClick={() => onUso(s.ruta)}
              className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors group">
              <span className="w-9 h-9 rounded-lg bg-[var(--color-primario)]/8 text-[var(--color-primario)] flex items-center justify-center shrink-0">
                <Icono className="w-4.5 h-4.5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-900">{s.titulo}</p>
                  <Aviso seccion={s} n={conteo(s)} />
                </div>
                <p className="text-xs text-slate-500 truncate">{s.descripcion}</p>
              </div>
              <BotonFavorito activo={favoritos.includes(s.ruta)} onClick={() => onFavorito(s.ruta)} titulo={s.titulo} />
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[var(--color-primario)] transition-colors shrink-0" aria-hidden="true" />
            </Link>
          )
        })}
      </div>
    )
  }

  if (vista === 'compacta') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {items.map(s => {
          const Icono = s.icono
          return (
            <Link key={s.ruta} to={s.ruta} onClick={() => onUso(s.ruta)} title={s.descripcion}
              className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg pl-3 pr-1.5 py-2 hover:border-[var(--color-primario)]/40 hover:bg-slate-50 transition-colors">
              <Icono className="w-4 h-4 text-[var(--color-primario)] shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span className="text-sm text-slate-800 truncate flex-1">{s.titulo}</span>
              <Aviso seccion={s} n={conteo(s)} compacto />
              <BotonFavorito activo={favoritos.includes(s.ruta)} onClick={() => onFavorito(s.ruta)} titulo={s.titulo} />
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map(s => {
        const Icono = s.icono
        return (
          <Link key={s.ruta} to={s.ruta} onClick={() => onUso(s.ruta)}
            className="relative bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 hover:shadow-md hover:border-[var(--color-primario)]/30 transition-all duration-150 group">
            <div className="flex items-start justify-between gap-2">
              <span className="w-11 h-11 rounded-lg bg-[var(--color-primario)]/8 text-[var(--color-primario)] flex items-center justify-center group-hover:bg-[var(--color-primario)] group-hover:text-white transition-colors">
                <Icono className="w-5.5 h-5.5" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <BotonFavorito activo={favoritos.includes(s.ruta)} onClick={() => onFavorito(s.ruta)} titulo={s.titulo} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">{s.titulo}</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">{s.descripcion}</p>
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 flex-wrap">
              <Aviso seccion={s} n={conteo(s)} />
              <span className="ml-auto flex items-center gap-1 text-xs text-[var(--color-primario)] font-medium group-hover:gap-2 transition-all">
                Abrir <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
