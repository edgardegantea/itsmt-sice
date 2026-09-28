import type { EstatusPlaneacion, PlaneacionDocente } from '../services/academico'

export const ESTATUS_COLOR: Record<EstatusPlaneacion, string> = {
  borrador:     'bg-slate-100 text-slate-600',
  enviada_da:   'bg-brand-100 text-brand-700',
  devuelta_da:  'bg-red-100 text-red-700',
  enviada_jc:   'bg-indigo-100 text-indigo-700',
  devuelta_jc:  'bg-red-100 text-red-700',
  liberada:     'bg-green-100 text-green-700',
}

export const ESTATUS_LABEL: Record<EstatusPlaneacion, string> = {
  borrador:     'Borrador',
  enviada_da:   'Enviada a Desarrollo Académico',
  devuelta_da:  'Devuelta por Desarrollo Académico',
  enviada_jc:   'Enviada a Jefatura de Carrera',
  devuelta_jc:  'Devuelta por Jefatura de Carrera',
  liberada:     'Liberada',
}

export const SIN_INICIAR = 'Sin iniciar'

/** Ícono por estatus (agrupado por semántica: borrador / enviada-en revisión / devuelta /
 * liberada) — se usa junto a ESTATUS_COLOR/ESTATUS_LABEL en cualquier pantalla que muestre
 * el badge de estatus, para que se reconozca de un vistazo sin tener que leer el texto. */
function IconoEstatus({ estatus, className = 'w-3 h-3' }: { estatus: EstatusPlaneacion; className?: string }) {
  if (estatus === 'liberada') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )
  }
  if (estatus === 'devuelta_da' || estatus === 'devuelta_jc') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.3 2.25h17.76a1.5 1.5 0 0 0 1.3-2.25L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z" />
      </svg>
    )
  }
  if (estatus === 'enviada_da' || estatus === 'enviada_jc') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
      </svg>
    )
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
    </svg>
  )
}

/** Badge de estatus reutilizable (listado, confirmación, revisión) — mismo componente en
 * las tres pantallas para que el color+ícono+texto sea consistente en todo el módulo. */
export function EstatusBadge({ estatus, className = '' }: { estatus: EstatusPlaneacion; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ESTATUS_COLOR[estatus]} ${className}`}>
      <IconoEstatus estatus={estatus} />
      {ESTATUS_LABEL[estatus]}
    </span>
  )
}

export const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600/40 transition-colors'
export const selectCls = inputCls
export const smallInputCls = 'w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600/40 transition-colors'

// "dosificacion" dejó de ser un paso propio — su tabla vive ahora como una vista más
// dentro de "Calendario de horas" (junto a Gantt y Resumen semanal), ya que se calcula
// exactamente de los mismos datos y tenerla aparte solo duplicaba la pantalla.
export type Paso = 'generales' | 'especificas' | 'calendario_horas' | 'calendarizacion_evaluacion'

export const PASOS: { id: Paso; numero: number; label: string }[] = [
  { id: 'generales',                 numero: 1, label: 'Caracterización, intención y competencia' },
  { id: 'especificas',               numero: 2, label: 'Competencias específicas' },
  { id: 'calendario_horas',          numero: 3, label: 'Calendario de horas' },
  { id: 'calendarizacion_evaluacion', numero: 4, label: 'Calendarización de evaluación' },
]

/** Categorías del "análisis por competencias específicas" (una por cada carpeta de la
 * cuadrícula del editor) — se comparte con la vista de revisión para que las observaciones
 * ancladas por Desarrollo Académico/Jefatura de Carrera usen exactamente el mismo catálogo. */
export type CategoriaId = 'analisis' | 'indicadores' | 'fuentes' | 'apoyo' | 'practicas'

export const CATEGORIAS: { id: CategoriaId; label: string }[] = [
  { id: 'analisis',    label: 'Análisis por Competencias' },
  { id: 'indicadores', label: 'Indicadores y evaluación' },
  { id: 'fuentes',     label: 'Fuentes de Información' },
  { id: 'apoyo',       label: 'Apoyo Didáctico' },
  { id: 'practicas',   label: 'Prácticas' },
]

/** Misma lógica que el editor usa para su propio avance, pero a partir de la planeación
 * guardada (para la tabla de "Mis asignaturas", que muestra el avance por fase sin abrir
 * el editor de esa asignatura). */
export function pasoCompletoPlaneacion(paso: Paso, p?: PlaneacionDocente): boolean {
  if (!p) return false
  switch (paso) {
    case 'generales':       return !!p.caracterizacion?.trim() && !!p.intencion_didactica?.trim() && !!p.competencia_asignatura?.trim()
    case 'especificas':     return (p.competencias?.length ?? 0) > 0
    case 'calendario_horas': return true
    case 'calendarizacion_evaluacion': return true
  }
}

export function PasoBadge({ completo }: { completo: boolean }) {
  return (
    <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-medium ${
      completo ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
    }`}>
      {completo ? '✓' : ''}
    </span>
  )
}

/** % de pasos completos de una planeación (o 0 si aún no existe) — usado para la barra de
 * progreso del listado de "Mis asignaturas", más fácil de escanear que 5 badges sueltos. */
export function progresoPlaneacion(p?: PlaneacionDocente): number {
  if (!p) return 0
  const completos = PASOS.filter(paso => pasoCompletoPlaneacion(paso.id, p)).length
  return Math.round((completos / PASOS.length) * 100)
}

export function BarraProgreso({ porcentaje, tono = 'azul' }: { porcentaje: number; tono?: 'azul' | 'verde' }) {
  const color = tono === 'verde' ? 'bg-emerald-500' : 'bg-brand-600'
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${porcentaje}%` }} />
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
