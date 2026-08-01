import type { EstatusPlaneacion, PlaneacionDocente } from '../services/academico'

export const ESTATUS_COLOR: Record<EstatusPlaneacion, string> = {
  borrador:     'bg-slate-100 text-slate-600',
  enviada_da:   'bg-blue-100 text-blue-700',
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

export const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30'
export const selectCls = inputCls
export const smallInputCls = 'w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30'

export type Paso = 'generales' | 'especificas' | 'dosificacion' | 'calendarizacion'

export const PASOS: { id: Paso; numero: number; label: string }[] = [
  { id: 'generales',       numero: 1, label: 'Caracterización, intención y competencia' },
  { id: 'especificas',     numero: 2, label: 'Competencias específicas' },
  { id: 'dosificacion',    numero: 3, label: 'Dosificación' },
  { id: 'calendarizacion', numero: 4, label: 'Calendarización' },
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
    case 'dosificacion':    return !!p.competencias?.some(c => c.dosificacion?.length > 0)
    case 'calendarizacion': return !!p.calendarizacion?.some(s => s.tipo_evaluacion !== '')
  }
}

export function PasoBadge({ completo }: { completo: boolean }) {
  return (
    <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-medium ${
      completo ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
    }`}>
      {completo ? '✓' : ''}
    </span>
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
