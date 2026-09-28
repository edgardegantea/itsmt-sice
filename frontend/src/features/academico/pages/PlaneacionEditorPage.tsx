import { useState, useEffect, useRef, useMemo, Fragment } from 'react'
import { Plus, Layers, ArrowRight, CheckCircle2, Check, Trash2, ListChecks, Target, BookOpen, Presentation, FlaskConical, CircleHelp, type LucideIcon } from 'lucide-react'
import GuiaInstrumentacionPanel from './GuiaInstrumentacionPanel'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authStore'
import { useToastStore } from '../../../store/toastStore'
import {
  academicoApi, mergeCargasPorAsignatura,
  type PlaneacionDocente, type CargaAcademica,
  type CompetenciaEspecifica, type SubtemaActividad, type SemanaCalendarizacion,
  type IndicadorAlcance, type FilaMatrizEvaluacion, type FilaActividad,
  type FuenteInformacion, type ObservacionCampo, type SeccionObservacion,
} from '../services/academico'
import {
  mutationError,
  ModalWrap,
  PlaneacionDetalle,
  HiloComentarios,
  ArchivosAdjuntos,
  MejorarConIa,
  SugerirActividadEnsenanza,
  SelectorProductoAprendizaje,
  SelectorInstrumentoEvaluacion,
  ModalInstrumentoEvaluacion,
  ModalFuenteInformacion,
} from './tabs/shared'
import { RichTextField, richTextAPlano } from '../../../components/RichTextField'
import apiClient from '../../../config/apiClient'
import {
  COMPETENCIAS_INSTRUMENTALES, COMPETENCIAS_INTERPERSONALES, COMPETENCIAS_SISTEMICAS,
  APOYOS_DIDACTICOS_CATALOGO, REQUISITOS_PRACTICA_CATALOGO,
  NIVEL_RANGO, semanasVacias, nuevaCompetencia, normalizarCompetencia, generarNivelesDesdeEvidencias,
  citarFuente, TIPO_FUENTE_LABEL, distribuirPorcentajeEvidencias,
  TOTAL_SEMANAS, horasObjetivo, totalHorasCapturadas, distribucionHorasSemanales,
  horasCapturadasUnidad, horasDisponiblesUnidad, semanasDeFila, obtenerFilasDeSubtema, subtemaPerteneceAFila,
  horasPorSemanaDeSubtema, rangoFechasSemana, temasPorSemana, calendarizacionEvaluaciones,
  generarDosificacionAutomatica, semanaActualDePeriodo,
  sincronizarIndicadoresConGenericas, esMismaCompetencia,
  extraerProductoDeActividad, integrarProductoEnTexto, removerProductoDeTexto,
} from './planeacionCatalogo'
import {
  ESTATUS_COLOR, ESTATUS_LABEL, PASOS, type Paso, Field,
  smallInputCls,
  CATEGORIAS, type CategoriaId,
} from './planeacionShared'
import { parseCitaDirecta } from './bibliografiaLookup'

const FUENTE_VACIA: FuenteInformacion = { tipo: '', titulo: '' }

const MOTIVO_VERSION_LABEL: Record<string, string> = {
  autoguardado: 'Guardado',
  envio: 'Envío a revisión',
  antes_de_restaurar: 'Antes de restaurar',
  restaurada: 'Restauración',
}
const CAMPO_VERSION_LABEL: Record<string, string> = {
  caracterizacion: 'Caracterización',
  intencion_didactica: 'Intención didáctica',
  competencia_asignatura: 'Competencia de la asignatura',
  competencias: 'Competencias específicas (unidades)',
  fuentes_informacion: 'Fuentes de información',
  apoyos_didacticos: 'Apoyo didáctico',
  calendarizacion: 'Calendarización',
}

function categoriaCompleta(comp: CompetenciaEspecifica, cat: CategoriaId): boolean {
  switch (cat) {
    case 'analisis':    return !!comp.descripcion.trim()
    case 'indicadores': return comp.indicadores_alcance.length > 0 && comp.matriz_evaluacion.length >= MIN_EVIDENCIAS_POR_UNIDAD
    case 'fuentes':      return comp.fuentes_informacion.length > 0
    case 'apoyo':        return comp.apoyos_didacticos.length > 0
    case 'practicas':    return comp.practicas.length > 0
  }
}

// TecNM-AC-PO-003 §4 — reglas de ponderación del "Análisis por competencias específicas":
// ninguna unidad puede aportar más del 40% de la calificación final, cada unidad necesita
// al menos 3 evidencias de aprendizaje, ninguna evidencia puede superar el 40% del
// porcentaje de su unidad, y la suma de evidencias de una unidad debe igualar ese porcentaje.
const LIMITE_PORCENTAJE_UNIDAD = 40
const MIN_EVIDENCIAS_POR_UNIDAD = 3

function limiteEvidencia(porcentajeUnidad: number | null): number {
  return Math.round((porcentajeUnidad ?? 0) * 0.4 * 100) / 100
}

/** Indicación de la guía del SGC que corresponde a cada sección del análisis por competencia. */
const SECCION_GUIA_POR_CATEGORIA: Record<CategoriaId, string> = {
  analisis: '4.3',
  indicadores: '4.8',
  fuentes: '5.1',
  apoyo: '5.2',
  practicas: '4.4',
}

/** Ícono de cada sección del análisis por competencia (vista principal del paso 4). */
const ICONO_CATEGORIA: Record<CategoriaId, LucideIcon> = {
  analisis: ListChecks,
  indicadores: Target,
  fuentes: BookOpen,
  apoyo: Presentation,
  practicas: FlaskConical,
}

/** Observación(es) de Desarrollo Académico/Jefatura de Carrera ancladas exactamente a la
 * sección donde el docente está parado — se muestran arriba del contenido correspondiente
 * para que sepa qué corregir sin tener que buscarlo en un comentario general. */
function NotaRevisor({ items }: { items: ObservacionCampo[] }) {
  if (!items.length) return null
  return (
    <div className="space-y-1.5 mb-3">
      {items.map(o => (
        <div key={o.id} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="shrink-0 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">!</span>
          <p className="text-xs text-amber-800 whitespace-pre-line">{o.texto}</p>
        </div>
      ))}
    </div>
  )
}

interface FormPlaneacion {
  caracterizacion: string
  intencion_didactica: string
  competencia_asignatura: string
  competencias: CompetenciaEspecifica[]
  calendarizacion: SemanaCalendarizacion[]
}

function formVacio(): FormPlaneacion {
  return {
    caracterizacion: '', intencion_didactica: '', competencia_asignatura: '',
    competencias: [],
    calendarizacion: semanasVacias(),
  }
}

/** Indica si un paso ya tiene contenido capturado, para mostrar su avance en la navegación. */
function pasoCompleto(paso: Paso, f: FormPlaneacion): boolean {
  switch (paso) {
    case 'generales':       return !!f.caracterizacion.trim() && !!f.intencion_didactica.trim() && !!f.competencia_asignatura.trim()
    case 'especificas':     return f.competencias.length > 0
    case 'calendario_horas': return true
    case 'calendarizacion_evaluacion': return true
  }
}

/** Panel de horas capturadas vs. objetivo (semanas × horas T/P semanales de la materia) —
 * compartido entre la cuadrícula de "Competencias específicas" y el "Calendario de horas",
 * para que el docente vea siempre cuántas horas le faltan o le sobran por dosificar. */
function ResumenHoras({ competencias, materia, onIrAUnidad }: {
  competencias: CompetenciaEspecifica[]
  materia?: CargaAcademica['materia']
  /** Si se pasa, se muestra debajo un desglose por tema con dónde faltan/sobran horas,
   * cada uno con un botón para ir directo a esa unidad y corregirlo. */
  onIrAUnidad?: (idx: number) => void
}) {
  const objetivo = horasObjetivo(materia)
  const capturado = totalHorasCapturadas(competencias)
  const fila = (label: string, cap: number, obj: number) => {
    const diff = Math.round((obj - cap) * 100) / 100
    const tono = diff === 0 ? 'green' : diff > 0 ? 'amber' : 'red'
    const border = tono === 'green' ? 'border-green-100' : tono === 'amber' ? 'border-amber-100' : 'border-red-100'
    const bg = tono === 'green' ? 'bg-green-50/50' : tono === 'amber' ? 'bg-amber-50/50' : 'bg-red-50/50'
    return (
      <div className={`rounded-lg border ${border} ${bg} px-3 py-2.5`}>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{cap}h <span className="font-normal text-slate-400">de {obj}h</span></p>
        <p className={`text-[11px] font-medium ${diff === 0 ? 'text-green-700' : diff > 0 ? 'text-amber-600' : 'text-red-600'}`}>
          {diff === 0 ? 'Completo' : diff > 0 ? `Faltan ${diff}h` : `Sobran ${-diff}h`}
        </p>
      </div>
    )
  }

  // Desglose por unidad — para no dejar al docente adivinando en cuál tema ajustar horas,
  // solo se listan las unidades cuya cuota (T+P) no cuadra exactamente con lo capturado.
  const desglose = onIrAUnidad
    ? competencias
        .map((comp, i) => {
          const disp = horasDisponiblesUnidad(materia, comp.porcentaje)
          const usado = horasCapturadasUnidad(comp)
          const diff = Math.round(((disp.teoria + disp.practica) - (usado.teoria + usado.practica)) * 100) / 100
          return { i, comp, diff }
        })
        .filter(({ diff }) => diff !== 0)
    : []

  return (
    <div className="border border-slate-200 rounded-xl shadow-sm shadow-slate-200/50 p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fila('Horas teóricas', capturado.teoria, objetivo.teoria)}
        {fila('Horas prácticas', capturado.practica, objetivo.practica)}
        {fila('Total', capturado.teoria + capturado.practica, objetivo.teoria + objetivo.practica)}
      </div>
      {desglose.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Dónde ajustar</p>
          {desglose.map(({ i, comp, diff }) => (
            <div key={i} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs ${diff > 0 ? 'bg-amber-50' : 'bg-red-50'}`}>
              <span className="text-slate-700 truncate">
                Tema {comp.numero}{comp.nombre_unidad ? ` — ${comp.nombre_unidad}` : ''}
                <span className={`ml-2 font-medium ${diff > 0 ? 'text-amber-700' : 'text-red-700'}`}>
                  {diff > 0 ? `faltan ${diff}h por agregar` : `sobran ${-diff}h por quitar`}
                </span>
              </span>
              <button type="button" onClick={() => onIrAUnidad?.(i)} className="shrink-0 text-brand-600 hover:underline font-medium">
                Ir a ajustar →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Badges de horas de la UNIDAD que se está viendo — cuánto lleva capturado en sus filas
 * de actividades contra la cuota que le toca (su `porcentaje` de aportación sobre el total
 * de horas T/P de la materia). Se muestra arriba de las 5 categorías de la unidad, visible
 * sin importar en cuál esté parado el docente, para que siempre sepa cuánto le queda por
 * dosificar en esa unidad específica. */
function BadgesHoras({ comp, materia }: { comp: CompetenciaEspecifica; materia?: CargaAcademica['materia'] }) {
  const disponible = horasDisponiblesUnidad(materia, comp.porcentaje)
  const usado = horasCapturadasUnidad(comp)
  const badge = (letra: 'T' | 'P', dot: string, cap: number, disp: number) => {
    const diff = Math.round((disp - cap) * 100) / 100
    const tono = diff === 0 ? 'bg-green-50 border-green-200 text-green-700' : diff > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold shadow-sm ${tono}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        {Math.round(cap)}{letra} de {Math.round(disp)}{letra} disponibles
      </span>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badge('T', 'bg-brand-500', usado.teoria, disponible.teoria)}
      {badge('P', 'bg-emerald-400', usado.practica, disponible.practica)}
      {!comp.porcentaje && (
        <span className="text-[11px] text-slate-400">Asigna el % de aportación de la unidad para calcular su cuota de horas.</span>
      )}
    </div>
  )
}

/** Celda de la vista Gantt del calendario de horas — una semana × un tema/subtema. Se
 * pinta en dos franjas (teoría arriba, práctica abajo) con la opacidad proporcional a las
 * horas de esa semana, para que "la cantidad de horas usadas" se note a simple vista y no
 * solo la presencia/ausencia de dosificación. */
function GanttCelda({ teoria, practica }: { teoria: number; practica: number }) {
  if (!teoria && !practica) return <td className="border-l border-slate-100" />
  const ESCALA = 4 // horas por semana que se consideran "saturación completa" del color
  const opacidad = (h: number) => Math.min(1, Math.max(0.25, h / ESCALA))
  return (
    <td className="border-l border-slate-100 p-0" title={`Teoría: ${teoria}h · Práctica: ${practica}h`}>
      <div className="flex flex-col h-8 w-full">
        <div className="flex-1 bg-brand-500" style={{ opacity: teoria ? opacidad(teoria) : 0 }} />
        <div className="flex-1 bg-emerald-400" style={{ opacity: practica ? opacidad(practica) : 0 }} />
      </div>
    </td>
  )
}

type EstadoDosificacion = 'pendiente' | 'a_tiempo' | 'adelantado' | 'atraso'

function estadoSubtema(s: { semana_inicio: number | null; semana_fin: number | null; semana_realizado: number | null }): EstadoDosificacion {
  if (s.semana_realizado == null) return 'pendiente'
  if (s.semana_inicio != null && s.semana_realizado < s.semana_inicio) return 'adelantado'
  if (s.semana_fin != null && s.semana_realizado > s.semana_fin) return 'atraso'
  return 'a_tiempo'
}

const ESTADO_DOSIFICACION_LABEL: Record<EstadoDosificacion, string> = {
  pendiente:  'Pendiente',
  a_tiempo:   'A tiempo',
  adelantado: 'Adelantado',
  atraso:     'Atraso',
}

const ESTADO_DOSIFICACION_COLOR: Record<EstadoDosificacion, string> = {
  pendiente:  'bg-slate-100 text-slate-500',
  a_tiempo:   'bg-green-100 text-green-700',
  adelantado: 'bg-brand-100 text-brand-700',
  atraso:     'bg-red-100 text-red-700',
}

/** Color de fondo por número de fila (N) — mismo color en "Temas y subtemas" y en su fila
 * correspondiente de "Actividades de enseñanza y aprendizaje", para que se note a simple
 * vista qué subtemas están ligados a qué fila de actividades/horas. */
const COLOR_FILA: Record<number, string> = {
  1: 'bg-emerald-50',
  2: 'bg-sky-50',
  3: 'bg-orange-50',
  4: 'bg-slate-100',
  5: 'bg-red-50',
}
function colorFila(n: number | null | undefined): string {
  return n != null ? (COLOR_FILA[n] ?? '') : ''
}

/** Componente selector multiselección para asociar una o varias filas de actividades a un subtema. */
function SelectorFilasSubtema({
  subtema,
  actividades,
  disabled,
  onChange,
}: {
  subtema: SubtemaActividad
  actividades: { numero: number }[]
  disabled?: boolean
  onChange: (filas: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const filasSeleccionadas = obtenerFilasDeSubtema(subtema)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const label = filasSeleccionadas.length > 0 ? filasSeleccionadas.join(', ') : 'N'

  const toggleFila = (num: number) => {
    let nuevas: number[]
    if (filasSeleccionadas.includes(num)) {
      nuevas = filasSeleccionadas.filter(n => n !== num)
    } else {
      nuevas = [...filasSeleccionadas, num].sort((a, b) => a - b)
    }
    onChange(nuevas)
  }

  return (
    <div className="relative inline-block text-left shrink-0" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`px-2 py-1 text-xs font-semibold rounded border transition-colors flex items-center gap-1 min-w-[3rem] justify-between ${
          filasSeleccionadas.length > 0
            ? 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100 font-mono'
            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 font-mono'
        }`}
        title="Asignar actividad(es) a este subtema (puede seleccionar una o más)"
      >
        <span>{label}</span>
        <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-full mt-1 z-30 w-48 bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-xs">
          <p className="font-semibold text-slate-700 mb-1.5 px-1">Actividades asignadas:</p>
          {actividades.length === 0 ? (
            <p className="text-slate-400 px-1 py-1 italic">Sin actividades registradas</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {actividades.map(a => {
                const isSelected = filasSeleccionadas.includes(a.numero)
                return (
                  <label
                    key={a.numero}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFila(a.numero)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="font-medium text-slate-700">Actividad {a.numero}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Tabla de dosificación de solo lectura (calculada a partir de las Horas T/P), compartida
 * entre el paso "5. Dosificación" y la vista "Dosificación" dentro de Calendario de horas —
 * incluye un filtro rápido para ver solo los subtemas con atraso y marca con un punto rojo
 * el nombre de cualquier unidad que tenga al menos uno, visible aunque el filtro esté apagado. */
function TablaDosificacion({ competencias, obsPara, planeacionId }: {
  competencias: CompetenciaEspecifica[]
  obsPara: (seccion: SeccionObservacion, opts?: { unidad?: number; categoria?: string }) => ObservacionCampo[]
  planeacionId?: string
}) {
  const [soloAtrasados, setSoloAtrasados] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
          <input type="checkbox" checked={soloAtrasados} onChange={e => setSoloAtrasados(e.target.checked)} className="w-3.5 h-3.5" />
          Solo atrasados
        </label>
      </div>

      {competencias.length === 0 && (
        <p className="text-xs text-slate-400 py-3">Registra primero las unidades en "Competencias específicas".</p>
      )}

      {competencias.map((comp, idx) => {
        const subtemasConEstado = comp.subtemas.map(sub => {
          const dos = comp.dosificacion.find(d => d.subtema === sub.texto)
            ?? { subtema: sub.texto, semana_inicio: null, semana_fin: null, semana_realizado: null }
          return { sub, dos, estado: estadoSubtema(dos) }
        })
        const tieneAtraso = subtemasConEstado.some(s => s.estado === 'atraso')
        const filas = soloAtrasados ? subtemasConEstado.filter(s => s.estado === 'atraso') : subtemasConEstado

        if (soloAtrasados && filas.length === 0) return null

        return (
          <div key={idx} className="border border-slate-200 rounded-xl p-4 shadow-sm shadow-slate-200/50">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-sm font-semibold text-slate-700">
                Tema {comp.numero}{comp.nombre_unidad ? ` — ${comp.nombre_unidad}` : ''}
              </p>
              {tieneAtraso && (
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Esta unidad tiene subtemas con atraso" />
              )}
            </div>
            <NotaRevisor items={obsPara('dosificacion', { unidad: comp.numero })} />
            {planeacionId && <HiloComentarios planeacionId={planeacionId} seccion="dosificacion" unidad={comp.numero} />}
            {comp.subtemas.length === 0 ? (
              <p className="text-xs text-slate-400">
                Sin temas ni subtemas registrados — agrégalos en "Competencias específicas → Análisis por Competencias".
              </p>
            ) : filas.length === 0 ? (
              <p className="text-xs text-slate-400">Sin subtemas con atraso en esta unidad.</p>
            ) : (
              <>
                {/* Pantallas pequeñas: tarjetas apiladas en vez de una tabla de 5 columnas. */}
                <div className="sm:hidden space-y-2">
                  {filas.map(({ sub, dos, estado }, sIdx) => (
                    <div key={sIdx} className="border border-slate-100 rounded-lg p-2.5 space-y-1.5 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-slate-700 flex-1 min-w-0">
                          {sub.texto || <span className="text-slate-300 italic">Subtema sin nombre</span>}
                        </p>
                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ESTADO_DOSIFICACION_COLOR[estado]}`}>
                          {ESTADO_DOSIFICACION_LABEL[estado]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500">
                        <span>Sem. inicio <span className="font-medium text-slate-600">{dos.semana_inicio ?? '—'}</span></span>
                        <span>Sem. fin <span className="font-medium text-slate-600">{dos.semana_fin ?? '—'}</span></span>
                        <span title="Lo confirma Desarrollo Académico en el corte">Sem. realizado <span className="font-medium text-slate-600">{dos.semana_realizado ?? '—'}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block border border-slate-200 rounded-lg overflow-hidden shadow-sm shadow-slate-200/50">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100/80">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium text-slate-500">Subtema</th>
                        <th className="px-2 py-1.5 text-center font-medium text-slate-500 w-20">Sem. inicio</th>
                        <th className="px-2 py-1.5 text-center font-medium text-slate-500 w-20">Sem. fin</th>
                        <th className="px-2 py-1.5 text-center font-medium text-slate-500 w-24" title="Lo confirma Desarrollo Académico en el corte, no el docente">Sem. realizado</th>
                        <th className="px-2 py-1.5 text-center font-medium text-slate-500 w-24">Estatus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 [&>tr:hover]:bg-slate-50/80">
                      {filas.map(({ sub, dos, estado }, sIdx) => (
                        <tr key={sIdx}>
                          <td className="px-2 py-1 text-slate-700">
                            {sub.texto || <span className="text-slate-300 italic">Subtema sin nombre</span>}
                          </td>
                          <td className="px-2 py-1 text-center text-slate-600">
                            {dos.semana_inicio ?? <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-2 py-1 text-center text-slate-600">
                            {dos.semana_fin ?? <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-2 py-1 text-center align-middle">
                            <span className="inline-flex items-center justify-center w-full text-slate-500" title="Lo confirma Desarrollo Académico en el corte">
                              {dos.semana_realizado ?? '—'}
                            </span>
                          </td>
                          <td className="px-2 py-1 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ESTADO_DOSIFICACION_COLOR[estado]}`}>
                              {ESTADO_DOSIFICACION_LABEL[estado]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function PlaneacionEditorPage() {
  const { cargaId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const periodoId = searchParams.get('periodo') ?? ''
  // Permite volver desde otra pantalla (p. ej. Captura de Calificaciones) directo al
  // paso desde el que se salió, en vez de reiniciar siempre en el primer paso.
  const pasoInicial = searchParams.get('paso')
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const toast = useToastStore()
  const [form, setForm] = useState<FormPlaneacion | null>(null)
  const [cargado, setCargado] = useState(false)
  const [infoAbierta, setInfoAbierta] = useState(true)
  const [paso, setPaso] = useState<Paso>(
    PASOS.some(p => p.id === pasoInicial) ? (pasoInicial as Paso) : 'generales'
  )
  const [vistaCompetencia, setVistaCompetencia] = useState<{ idx: number; cat: CategoriaId } | null>(null)
  const [guiaAbierta, setGuiaAbierta] = useState(false)
  // El ancho de la columna "Tema / Subtema" del Gantt y la vista activa de "Calendario de
  // horas" se recuerdan por materia (localStorage) — así no hay que reajustarlos cada vez
  // que se reabre la instrumentación.
  const [vistaHoras, setVistaHorasState] = useState<'gantt' | 'resumen' | 'dosificacion'>(() => {
    const guardada = localStorage.getItem(`planeacion-vista-horas-${cargaId}`)
    return guardada === 'gantt' || guardada === 'resumen' || guardada === 'dosificacion' ? guardada : 'gantt'
  })
  const setVistaHoras = (v: 'gantt' | 'resumen' | 'dosificacion') => {
    setVistaHorasState(v)
    localStorage.setItem(`planeacion-vista-horas-${cargaId}`, v)
  }

  // Cambia de paso y refleja el paso activo en la URL, para que recargar la página (o
  // volver desde otra pantalla) mantenga al docente donde estaba en vez de reiniciar
  // siempre en el primer paso.
  const cambiarPaso = (id: Paso) => {
    setPaso(id)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('paso', id)
      return next
    }, { replace: true })
  }
  // Ancho de la columna "Tema / Subtema" del Gantt — arrastrable por el docente (el
  // nombre del tema puede ser largo; con el mouse decide cuánto sacrificarle al resto
  // de las semanas). El texto completo siempre queda disponible como tooltip al pasar
  // el cursor, sin importar qué tan angosta quede la columna.
  const [anchoColumnaTema, setAnchoColumnaTemaState] = useState(() => {
    const guardado = Number(localStorage.getItem(`planeacion-ancho-tema-${cargaId}`))
    return guardado >= 64 && guardado <= 400 ? guardado : 128
  })
  const setAnchoColumnaTema = (n: number) => {
    setAnchoColumnaTemaState(n)
    localStorage.setItem(`planeacion-ancho-tema-${cargaId}`, String(Math.round(n)))
  }
  const arrastrandoColumnaTema = useRef(false)
  const [descargandoPdf, setDescargandoPdf] = useState(false)
  const [descargandoPdfInstrumentacion, setDescargandoPdfInstrumentacion] = useState(false)
  const [descargandoDocxInstrumentacion, setDescargandoDocxInstrumentacion] = useState(false)
  const [nuevoApoyo, setNuevoApoyo] = useState<Record<number, string>>({})
  const [nuevoRequisito, setNuevoRequisito] = useState<Record<string, string>>({})
  const [lugarOtroActivo, setLugarOtroActivo] = useState<Record<string, boolean>>({})
  const [modalFuente, setModalFuente] = useState<{ idx: number; fIdx: number | null; modoInicial?: 'individual' | 'masivo' | 'reutilizar' } | null>(null)
  const [draftFuente, setDraftFuente] = useState<FuenteInformacion>(FUENTE_VACIA)
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false)
  const [modalCompararAbierto, setModalCompararAbierto] = useState(false)
  const [modalVistaPrevia, setModalVistaPrevia] = useState(false)
  const [vistaPreviaTab, setVistaPreviaTab] = useState<'web' | 'pdf'>('web')
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [cargandoPdfPreview, setCargandoPdfPreview] = useState(false)
  const [fechaEmisionPdf, setFechaEmisionPdf] = useState<string>('')
  const esSuperAdmin = !!user?.roles?.some(r => ['superadmin', 'admin', 'director_academico', 'subdireccion_academica'].includes(r))
  // El menú "Más acciones" es un <details> nativo, que no se cierra solo al hacer clic
  // fuera — se cierra a mano escuchando clics en todo el documento.
  const menuAccionesRef = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const cerrarSiEsFuera = (e: MouseEvent) => {
      if (menuAccionesRef.current?.open && !menuAccionesRef.current.contains(e.target as Node)) {
        menuAccionesRef.current.removeAttribute('open')
      }
    }
    document.addEventListener('mousedown', cerrarSiEsFuera)
    return () => document.removeEventListener('mousedown', cerrarSiEsFuera)
  }, [])
  // Papelera de indicadores/evidencias/actividades borrados — solo en memoria de esta
  // sesión del editor (se pierde al recargar), pero evita el caso más común de "los borré
  // sin querer" sin necesitar persistirlo en el servidor.
  const [papelera, setPapelera] = useState<{
    id: string
    tipo: 'indicador' | 'evidencia' | 'actividad'
    unidadIdx: number
    unidadNumero: number
    etiqueta: string
    item: IndicadorAlcance | FilaMatrizEvaluacion | FilaActividad
    eliminadoEn: number
  }[]>([])
  const [modalPapeleraAbierto, setModalPapeleraAbierto] = useState(false)
  const [modalInstrumento, setModalInstrumento] = useState<{
    unidadIdx: number
    filaIdx: number
    evidencia: string
    ponderacion: number | null
    competencia: string
    actividadAprendizaje?: string
    valorInicial: string
  } | null>(null)

  // Estado para redimensionamiento de columnas de actividades (porcentaje columna enseñanza vs aprendizaje)
  const [anchoColEnsenanza, setAnchoColEnsenanza] = useState(50)
  const [arrastrandoResizer, setArrastrandoResizer] = useState(false)
  const tablaActividadesRef = useRef<HTMLTableElement>(null)

  // Estado para personalización y edición de competencias genéricas
  const [genericasPersonalizadas, setGenericasPersonalizadas] = useState<Record<number, Record<string, string[]>>>({})
  const [genericaEnEdicion, setGenericaEnEdicion] = useState<{ unidadIdx: number; nombreOriginal: string; nuevoNombre: string } | null>(null)
  const [nuevaGenericaInput, setNuevaGenericaInput] = useState<{ unidadIdx: number; categoria: string; texto: string } | null>(null)

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos-select'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; activo: boolean; fecha_inicio: string }[]),
    staleTime: 60_000,
  })

  const { data: misCargas = [], isSuccess: cargasListas } = useQuery({
    queryKey: ['mis-cargas', periodoId, user?.id],
    queryFn: () => academicoApi.getCargas({ docente_id: user!.id, periodo_id: periodoId }),
    enabled: !!periodoId && !!user?.id,
  })

  const { data: misPlaneaciones = [], isSuccess: planeacionesListas } = useQuery({
    queryKey: ['mis-planeaciones', periodoId],
    queryFn: () => academicoApi.getMisPlaneaciones(periodoId ? { periodo_id: periodoId } : undefined),
    enabled: !!user?.id,
  })

  // Aulas registradas en el sistema, para precargar el campo "Lugar" de las prácticas.
  const { data: aulas = [] } = useQuery({
    queryKey: ['aulas-select'],
    queryFn: () => academicoApi.getAulas(),
    staleTime: 60_000,
  })

  const cargaActual = (misCargas as CargaAcademica[]).find(c => c.id === cargaId)
  const periodoActual = periodos.find(p => p.id === periodoId)
  const planeacionActual = (misPlaneaciones as PlaneacionDocente[]).find(p => p.carga_academica_id === cargaId)
  const soloLectura = !!planeacionActual && ['enviada_da', 'enviada_jc', 'liberada'].includes(planeacionActual.estatus)

  const descargarPdfCalendario = async () => {
    if (!planeacionActual) return
    setDescargandoPdf(true)
    try {
      await academicoApi.descargarPdfCalendarioPlaneacion(
        planeacionActual.id,
        `calendario_${cargaActual?.materia?.nombre ?? 'planeacion'}.pdf`
      )
    } finally {
      setDescargandoPdf(false)
    }
  }

  // Documento completo en el formato oficial TecNM-AC-PO-003-02 (instrumentación didáctica),
  // distinto del PDF de calendario que solo cubre horas/dosificación.
  const descargarPdfInstrumentacion = async (fechaForzada?: string) => {
    if (!planeacionActual) return
    setDescargandoPdfInstrumentacion(true)
    const fechaAUsar = fechaForzada || fechaEmisionPdf
    try {
      await academicoApi.descargarPdfInstrumentacionPlaneacion(
        planeacionActual.id,
        `instrumentacion_didactica_${cargaActual?.materia?.nombre ?? 'planeacion'}.pdf`,
        fechaAUsar ? { fecha_elaboracion: fechaAUsar } : undefined
      )
    } finally {
      setDescargandoPdfInstrumentacion(false)
    }
  }

  // Mismo contenido que el PDF oficial, pero en .docx editable — para que el docente pueda
  // ajustar redacción fuera del sistema (o entregarlo a alguien que solo maneje Word).
  const descargarDocxInstrumentacion = async () => {
    if (!planeacionActual) return
    setDescargandoDocxInstrumentacion(true)
    try {
      await academicoApi.descargarDocxInstrumentacionPlaneacion(
        planeacionActual.id,
        `instrumentacion_didactica_${cargaActual?.materia?.nombre ?? 'planeacion'}.docx`
      )
    } finally {
      setDescargandoDocxInstrumentacion(false)
    }
  }

  const planeacionConFormActual = useMemo<PlaneacionDocente | null>(() => {
    if (!planeacionActual) return null
    return {
      ...planeacionActual,
      caracterizacion: form?.caracterizacion ?? planeacionActual.caracterizacion,
      intencion_didactica: form?.intencion_didactica ?? planeacionActual.intencion_didactica,
      competencia_asignatura: form?.competencia_asignatura ?? planeacionActual.competencia_asignatura,
      competencias: form?.competencias ?? planeacionActual.competencias,
      calendarizacion: form?.calendarizacion ?? planeacionActual.calendarizacion,
    }
  }, [planeacionActual, form])

  const cargarPdfPreview = async (fechaForzada?: string) => {
    if (!planeacionActual?.id) return
    setCargandoPdfPreview(true)
    const fechaAUsar = fechaForzada ?? fechaEmisionPdf
    try {
      const res = await apiClient.get(`/planeaciones-docentes/${planeacionActual.id}/pdf-instrumentacion`, {
        responseType: 'blob',
        params: fechaAUsar ? { fecha_elaboracion: fechaAUsar } : undefined,
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfBlobUrl(url)
    } catch {
      useToastStore.getState().error('No se pudo generar el PDF de vista previa.')
    } finally {
      setCargandoPdfPreview(false)
    }
  }

  const abrirVistaPrevia = () => {
    setModalVistaPrevia(true)
    if (vistaPreviaTab === 'pdf' && !pdfBlobUrl) {
      cargarPdfPreview()
    }
  }

  const cambiarTabVistaPrevia = (tab: 'web' | 'pdf') => {
    setVistaPreviaTab(tab)
    if (tab === 'pdf' && !pdfBlobUrl) {
      cargarPdfPreview()
    }
  }

  const cerrarVistaPrevia = () => {
    setModalVistaPrevia(false)
  }

  // Para enlazar directo a "Captura de calificaciones" desde la calendarización de
  // evaluación: esa pantalla resuelve la carga académica "canónica" fusionando todas las
  // que compartan materia+grupo (mergeCargasPorAsignatura) y se queda con la de id menor —
  // no necesariamente la misma carga_academica_id de esta planeación (que puede ser uno de
  // varios bloques día/hora de la misma materia). Hay que resolver ese mismo id canónico
  // aquí para que el enlace no caiga en "Esta materia ya no está asignada a este grupo".
  const grupoIdActual = cargaActual?.grupos?.[0]?.id
  const { data: grupoParaCalificaciones } = useQuery({
    queryKey: ['grupo-detalle-calificaciones-link', grupoIdActual],
    queryFn: () => academicoApi.getGrupo(grupoIdActual!),
    enabled: !!grupoIdActual,
    staleTime: 60_000,
  })
  const cargaCanonicaCalificaciones = grupoParaCalificaciones
    ? mergeCargasPorAsignatura(grupoParaCalificaciones.cargas ?? []).find(c => c.materia_id === cargaActual?.materia_id)
    : undefined

  const observacionesCampos = planeacionActual?.observaciones_campos ?? []
  const obsPara = (seccion: SeccionObservacion, opts?: { unidad?: number; categoria?: string }) =>
    observacionesCampos.filter(o =>
      o.seccion === seccion &&
      (opts?.unidad === undefined || o.unidad === opts.unidad) &&
      (opts?.categoria === undefined || o.categoria === opts.categoria)
    )
  const SECCIONES_POR_PASO: Record<Paso, SeccionObservacion[]> = {
    generales: ['caracterizacion', 'intencion_didactica', 'competencia_asignatura'],
    especificas: ['especifica'],
    calendario_horas: ['dosificacion'],
    calendarizacion_evaluacion: [],
  }
  const pasoTieneObservacion = (p: Paso) => observacionesCampos.some(o => SECCIONES_POR_PASO[p].includes(o.seccion))

  const formDesdePlaneacion = (p: PlaneacionDocente): FormPlaneacion => ({
    caracterizacion:         p.caracterizacion ?? '',
    intencion_didactica:     p.intencion_didactica ?? '',
    competencia_asignatura: p.competencia_asignatura ?? '',
    competencias:            (p.competencias ?? []).map((c, i) => normalizarCompetencia({ ...c, numero: c.numero ?? i + 1 })),
    calendarizacion:         p.calendarizacion?.length === 16 ? p.calendarizacion : semanasVacias(),
  })

  // Para una instrumentación nueva (sin planeación previa), precarga lo que ya está
  // estandarizado a nivel de la asignatura (módulo de Materias) — caracterización,
  // intención didáctica, competencia, temario/actividades de aprendizaje por tema y
  // fuentes de información (en la primera unidad) — para que el docente solo tenga que
  // ajustarlo y enfocarse en actividades de enseñanza, indicadores/evaluación y calendarización.
  const formDesdeMateria = (materia?: CargaAcademica['materia']): FormPlaneacion => {
    if (!materia) return formVacio()
    const temario = materia.temario ?? []
    const actividadesPorTema = new Map((materia.actividades_aprendizaje ?? []).map(a => [a.tema, a]))
    const fuentesMateria = (materia.fuentes_informacion ?? []).map(f => parseCitaDirecta(f))
    const competencias: CompetenciaEspecifica[] = temario.map((t, i) => {
      const actividad = actividadesPorTema.get(t.tema)
      return {
        ...nuevaCompetencia(i + 1),
        nombre_unidad: t.tema,
        descripcion: actividad?.competencias ?? '',
        subtemas: [t.tema, ...(t.subtemas ?? [])].map(texto => ({ texto, fila: 1, filas: [1] })),
        actividades: [{
          numero: 1,
          actividad_ensenanza: '',
          actividad_aprendizaje: actividad?.actividades?.join('\n') ?? '',
          horas_teoricas: null,
          horas_practicas: null,
        }],
        fuentes_informacion: i === 0 ? fuentesMateria : [],
      }
    })
    return {
      caracterizacion:        materia.caracterizacion ?? '',
      intencion_didactica:    materia.intencion_didactica ?? '',
      competencia_asignatura: materia.competencia_especifica ?? '',
      competencias,
      calendarizacion:        semanasVacias(),
    }
  }

  const set = <K extends keyof FormPlaneacion>(k: K, v: FormPlaneacion[K]) => setForm(f => f ? { ...f, [k]: v } : f)

  // ── Competencias específicas (bloque repetible §4, una por unidad) ──────────
  const agregarCompetencia = () => setForm(f => f ? {
    ...f, competencias: [...f.competencias, nuevaCompetencia(f.competencias.length + 1)],
  } : f)

  const quitarCompetencia = (idx: number) => setForm(f => f ? {
    ...f, competencias: f.competencias.filter((_, i) => i !== idx).map((c, i) => ({ ...c, numero: i + 1 })),
  } : f)

  const setCompetencia = (idx: number, patch: Partial<CompetenciaEspecifica>) => setForm(f => f ? {
    ...f, competencias: f.competencias.map((c, i) => i === idx ? { ...c, ...patch } : c),
  } : f)

  // Actividades de enseñanza/aprendizaje (filas numeradas §4 "Análisis por competencias")
  const agregarActividad = (idx: number) => setCompetencia(idx, {
    actividades: [...form!.competencias[idx].actividades, {
      numero: form!.competencias[idx].actividades.length + 1,
      actividad_ensenanza: '', actividad_aprendizaje: '', horas_teoricas: null, horas_practicas: null,
    }],
  })
  // Al borrar un indicador/evidencia/actividad se archiva en la papelera de esta sesión
  // ANTES de quitarlo del formulario, para poder deshacerlo si fue un error — ver el botón
  // "Papelera" en el menú "Más acciones".
  const enviarAPapelera = (tipo: 'indicador' | 'evidencia' | 'actividad', idx: number, etiqueta: string, item: IndicadorAlcance | FilaMatrizEvaluacion | FilaActividad) => {
    setPapelera(p => [{
      id: crypto.randomUUID(), tipo, unidadIdx: idx, unidadNumero: form!.competencias[idx].numero,
      etiqueta: etiqueta || '(sin nombre)', item, eliminadoEn: Date.now(),
    }, ...p])
  }

  // Restaura un elemento de la papelera al final de su lista original. Si la unidad se
  // movió/eliminó desde que se borró el elemento, unidadIdx puede ya no apuntar a la unidad
  // correcta — se valida contra unidadNumero antes de restaurar en vez de asumirlo a ciegas.
  const restaurarDePapelera = (id: string) => {
    const entry = papelera.find(p => p.id === id)
    if (!entry || !form) return
    const comp = form.competencias[entry.unidadIdx]
    if (!comp || comp.numero !== entry.unidadNumero) {
      toast.error('Esa unidad ya no existe o cambió de posición — no se pudo restaurar automáticamente.')
      return
    }
    if (entry.tipo === 'indicador') {
      setCompetencia(entry.unidadIdx, { indicadores_alcance: [...comp.indicadores_alcance, entry.item as IndicadorAlcance] })
    } else if (entry.tipo === 'evidencia') {
      setCompetencia(entry.unidadIdx, { matriz_evaluacion: [...comp.matriz_evaluacion, entry.item as FilaMatrizEvaluacion] })
    } else {
      const nuevaActividad = { ...(entry.item as FilaActividad), numero: comp.actividades.length + 1 }
      setCompetencia(entry.unidadIdx, { actividades: [...comp.actividades, nuevaActividad] })
    }
    setPapelera(p => p.filter(x => x.id !== id))
    toast.success('Restaurado.')
  }

  const quitarActividad = (idx: number, aIdx: number) => {
    const item = form!.competencias[idx].actividades[aIdx]
    enviarAPapelera('actividad', idx, item.actividad_ensenanza || item.actividad_aprendizaje, item)
    setCompetencia(idx, {
      actividades: form!.competencias[idx].actividades.filter((_, i) => i !== aIdx).map((a, i) => ({ ...a, numero: i + 1 })),
    })
  }
  const setActividad = (idx: number, aIdx: number, patch: Partial<{ actividad_ensenanza: string; actividad_aprendizaje: string; horas_teoricas: number | null; horas_practicas: number | null }>) =>
    setCompetencia(idx, {
      actividades: form!.competencias[idx].actividades.map((a, i) => i === aIdx ? { ...a, ...patch } : a),
    })
  // Asigna un producto/evidencia de aprendizaje a una fila de actividad:
  // 1. Integra la evidencia en el texto enriquecido de la actividad de aprendizaje
  // 2. Sincroniza automáticamente la evidencia en matriz_evaluacion (pestaña Indicadores y evaluación)
  const aplicarProductoAActividad = (idx: number, aIdx: number, producto: string) => {
    const comp = form!.competencias[idx]
    const act = comp.actividades[aIdx]
    const productoAnterior = extraerProductoDeActividad(act.actividad_aprendizaje)
    
    // 1. Actualizar texto de la actividad de aprendizaje
    const nuevoTexto = integrarProductoEnTexto(act.actividad_aprendizaje, producto)
    const nuevasActividades = comp.actividades.map((a, i) => i === aIdx ? { ...a, actividad_aprendizaje: nuevoTexto } : a)
    
    // 2. Sincronizar en matriz_evaluacion (Indicadores y evaluación)
    let nuevaMatriz = [...comp.matriz_evaluacion]
    if (productoAnterior && productoAnterior.trim() !== producto.trim()) {
      const filaExistenteIdx = nuevaMatriz.findIndex(f => esMismaCompetencia(f.evidencia, productoAnterior) || f.evidencia.toLowerCase().includes(productoAnterior.toLowerCase()))
      if (filaExistenteIdx >= 0) {
        nuevaMatriz[filaExistenteIdx] = {
          ...nuevaMatriz[filaExistenteIdx],
          evidencia: producto,
        }
      } else {
        const yaExiste = nuevaMatriz.some(f => esMismaCompetencia(f.evidencia, producto))
        if (!yaExiste) {
          nuevaMatriz.push({
            evidencia: producto,
            porcentaje: null,
            indicadores: [],
            evaluacion_formativa: '',
          })
        }
      }
    } else {
      const yaExiste = nuevaMatriz.some(f => esMismaCompetencia(f.evidencia, producto))
      if (!yaExiste) {
        nuevaMatriz.push({
          evidencia: producto,
          porcentaje: null,
          indicadores: [],
          evaluacion_formativa: '',
        })
      }
    }
    
    // 3. Distribuir porcentaje
    const matrizDistribuida = distribuirPorcentajeEvidencias(nuevaMatriz, comp.indicadores_alcance, comp.porcentaje)
    
    setCompetencia(idx, {
      actividades: nuevasActividades,
      matriz_evaluacion: matrizDistribuida,
    })
  }

  const quitarProductoDeActividad = (idx: number, aIdx: number) => {
    const comp = form!.competencias[idx]
    const act = comp.actividades[aIdx]
    const productoAnterior = extraerProductoDeActividad(act.actividad_aprendizaje)
    
    const nuevoTexto = removerProductoDeTexto(act.actividad_aprendizaje)
    const nuevasActividades = comp.actividades.map((a, i) => i === aIdx ? { ...a, actividad_aprendizaje: nuevoTexto } : a)
    
    let nuevaMatriz = comp.matriz_evaluacion
    if (productoAnterior) {
      nuevaMatriz = comp.matriz_evaluacion.filter(f => !esMismaCompetencia(f.evidencia, productoAnterior) && !f.evidencia.toLowerCase().includes(productoAnterior.toLowerCase()))
    }
    
    const matrizDistribuida = distribuirPorcentajeEvidencias(nuevaMatriz, comp.indicadores_alcance, comp.porcentaje)
    
    setCompetencia(idx, {
      actividades: nuevasActividades,
      matriz_evaluacion: matrizDistribuida,
    })
  }

  const aplicarMejoraEnsenanza = (idx: number, aIdx: number, textoMejorado: string) => {
    let htmlResult = textoMejorado.includes('<')
      ? textoMejorado
      : textoMejorado.split('\n\n').map(p => `<div>${p}</div>`).join('')
    setActividad(idx, aIdx, { actividad_ensenanza: htmlResult })
  }

  const aplicarMejoraAprendizaje = (idx: number, aIdx: number, textoMejorado: string, productoSugerido?: string) => {
    const comp = form!.competencias[idx]
    const act = comp.actividades[aIdx]
    const prodFinal = productoSugerido || extraerProductoDeActividad(textoMejorado) || extraerProductoDeActividad(act.actividad_aprendizaje)
    
    let htmlResult = textoMejorado.includes('<')
      ? textoMejorado
      : textoMejorado.split('\n\n').map(p => `<div>${p}</div>`).join('')

    if (prodFinal) {
      const nuevoTexto = integrarProductoEnTexto(htmlResult, prodFinal)
      const nuevasActividades = comp.actividades.map((a, i) => i === aIdx ? { ...a, actividad_aprendizaje: nuevoTexto } : a)
      
      const productoAnterior = extraerProductoDeActividad(act.actividad_aprendizaje)
      let nuevaMatriz = [...comp.matriz_evaluacion]
      
      if (productoAnterior && productoAnterior.trim() !== prodFinal.trim()) {
        const filaExistenteIdx = nuevaMatriz.findIndex(f => esMismaCompetencia(f.evidencia, productoAnterior) || f.evidencia.toLowerCase().includes(productoAnterior.toLowerCase()))
        if (filaExistenteIdx >= 0) {
          nuevaMatriz[filaExistenteIdx] = { ...nuevaMatriz[filaExistenteIdx], evidencia: prodFinal }
        } else {
          const yaExiste = nuevaMatriz.some(f => esMismaCompetencia(f.evidencia, prodFinal))
          if (!yaExiste) {
            nuevaMatriz.push({ evidencia: prodFinal, porcentaje: null, indicadores: [], evaluacion_formativa: '' })
          }
        }
      } else {
        const yaExiste = nuevaMatriz.some(f => esMismaCompetencia(f.evidencia, prodFinal))
        if (!yaExiste) {
          nuevaMatriz.push({ evidencia: prodFinal, porcentaje: null, indicadores: [], evaluacion_formativa: '' })
        }
      }

      setCompetencia(idx, { actividades: nuevasActividades, matriz_evaluacion: nuevaMatriz })
    } else {
      setActividad(idx, aIdx, { actividad_aprendizaje: htmlResult })
    }
  }

  // Subtemas del temario, cada uno asociado a una fila de actividades por número — es la
  // única lista de subtemas que captura el docente; la Dosificación se deriva de esta misma
  // lista (ver upsertDosificacion) en vez de mantener una segunda lista separada que había
  // que llenar dos veces.
  const agregarSubtemaTema = (idx: number) => setCompetencia(idx, {
    subtemas: [...form!.competencias[idx].subtemas, { texto: '', fila: null, filas: [] }],
  })
  const quitarSubtemaTema = (idx: number, sIdx: number) => setCompetencia(idx, {
    subtemas: form!.competencias[idx].subtemas.filter((_, i) => i !== sIdx),
    // Se quita también su renglón de dosificación (si ya tenía semanas capturadas) para no
    // dejar un registro huérfano que ya no corresponde a ningún subtema visible.
    dosificacion: form!.competencias[idx].dosificacion.filter(d => d.subtema !== form!.competencias[idx].subtemas[sIdx]?.texto),
  })
  const setSubtemaTema = (idx: number, sIdx: number, patch: Partial<SubtemaActividad>) => {
    const textoAnterior = form!.competencias[idx].subtemas[sIdx].texto
    setCompetencia(idx, {
      subtemas: form!.competencias[idx].subtemas.map((s, i) => i === sIdx ? { ...s, ...patch } : s),
      // Si se renombra el subtema, su renglón de dosificación (si existe) se renombra junto
      // con él para que no pierda las semanas ya capturadas.
      dosificacion: patch.texto !== undefined
        ? form!.competencias[idx].dosificacion.map(d => d.subtema === textoAnterior ? { ...d, subtema: patch.texto! } : d)
        : form!.competencias[idx].dosificacion,
    })
  }

  const toggleCompetenciaGenerica = (idx: number, nombre: string) => setForm(f => {
    if (!f) return f
    const comp = f.competencias[idx]
    const activo = comp.competencias_genericas.includes(nombre)
    const nuevas = activo ? comp.competencias_genericas.filter(n => n !== nombre) : [...comp.competencias_genericas, nombre]
    const indicadoresSincronizados = sincronizarIndicadoresConGenericas(comp.indicadores_alcance, nuevas)
    return {
      ...f,
      competencias: f.competencias.map((c, i) => i === idx ? {
        ...c,
        competencias_genericas: nuevas,
        indicadores_alcance: indicadoresSincronizados,
        matriz_evaluacion: distribuirPorcentajeEvidencias(c.matriz_evaluacion, indicadoresSincronizados, c.porcentaje),
      } : c),
    }
  })

  const agregarCompetenciaGenericaPersonalizada = (unidadIdx: number, categoria: string, texto: string) => {
    const limpio = texto.trim()
    if (!limpio) return
    setGenericasPersonalizadas(prev => {
      const actualUnidad = prev[unidadIdx] || { Instrumentales: [], Interpersonales: [], Sistémicas: [], Otras: [] }
      const listaCat = actualUnidad[categoria] || []
      if (listaCat.includes(limpio)) return prev
      return {
        ...prev,
        [unidadIdx]: {
          ...actualUnidad,
          [categoria]: [...listaCat, limpio],
        },
      }
    })
    // Marcarla como activa y sincronizar indicadores automáticamente
    setForm(f => {
      if (!f) return f
      const comp = f.competencias[unidadIdx]
      if (comp.competencias_genericas.includes(limpio)) return f
      const nuevas = [...comp.competencias_genericas, limpio]
      const indSincronizados = sincronizarIndicadoresConGenericas(comp.indicadores_alcance, nuevas)
      return {
        ...f,
        competencias: f.competencias.map((c, i) => i === unidadIdx ? {
          ...c,
          competencias_genericas: nuevas,
          indicadores_alcance: indSincronizados,
          matriz_evaluacion: distribuirPorcentajeEvidencias(c.matriz_evaluacion, indSincronizados, c.porcentaje),
        } : c),
      }
    })
    setNuevaGenericaInput(null)
  }

  const guardarEdicionCompetenciaGenerica = (unidadIdx: number, nombreOriginal: string, nuevoNombre: string) => {
    const limpio = nuevoNombre.trim()
    if (!limpio || limpio === nombreOriginal) {
      setGenericaEnEdicion(null)
      return
    }
    setForm(f => {
      if (!f) return f
      const comp = f.competencias[unidadIdx]
      const nuevasGenericas = comp.competencias_genericas.map(g => esMismaCompetencia(g, nombreOriginal) ? limpio : g)
      const nuevosIndicadores = comp.indicadores_alcance.map(ind => esMismaCompetencia(ind.indicador, nombreOriginal) ? { ...ind, indicador: limpio } : ind)
      return {
        ...f,
        competencias: f.competencias.map((c, i) => i === unidadIdx ? {
          ...c,
          competencias_genericas: nuevasGenericas,
          indicadores_alcance: nuevosIndicadores,
        } : c),
      }
    })
    setGenericasPersonalizadas(prev => {
      const actualUnidad = prev[unidadIdx]
      if (!actualUnidad) return prev
      const nuevaUnidad: Record<string, string[]> = {}
      for (const [cat, items] of Object.entries(actualUnidad)) {
        nuevaUnidad[cat] = items.map(item => item === nombreOriginal ? limpio : item)
      }
      return { ...prev, [unidadIdx]: nuevaUnidad }
    })
    setGenericaEnEdicion(null)
  }

  const quitarCompetenciaGenericaPersonalizada = (unidadIdx: number, categoria: string, nombre: string) => {
    if (form?.competencias[unidadIdx]?.competencias_genericas.includes(nombre)) {
      toggleCompetenciaGenerica(unidadIdx, nombre)
    }
    setGenericasPersonalizadas(prev => {
      const actualUnidad = prev[unidadIdx]
      if (!actualUnidad) return prev
      return {
        ...prev,
        [unidadIdx]: {
          ...actualUnidad,
          [categoria]: (actualUnidad[categoria] || []).filter(item => item !== nombre),
        },
      }
    })
  }

  const iniciarArrastreColumna = (e: React.MouseEvent) => {
    e.preventDefault()
    setArrastrandoResizer(true)
    const tabla = tablaActividadesRef.current
    if (!tabla) return
    const rectTabla = tabla.getBoundingClientRect()
    // Columnas fijas: N (36px) + H·Sem (72px) = 108px
    const anchoFijo = 108
    const anchoDisponible = Math.max(200, rectTabla.width - anchoFijo)

    const onMouseMove = (ev: MouseEvent) => {
      const posRelativa = ev.clientX - rectTabla.left - 36
      const porcentaje = Math.min(80, Math.max(20, Math.round((posRelativa / anchoDisponible) * 100)))
      setAnchoColEnsenanza(porcentaje)
    }

    const onMouseUp = () => {
      setArrastrandoResizer(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // Indicadores de alcance
  const agregarIndicador = (idx: number) => {
    const comp = form!.competencias[idx]
    const siguienteLetra = String.fromCharCode(65 + comp.indicadores_alcance.length)
    setCompetencia(idx, {
      indicadores_alcance: [...comp.indicadores_alcance, { letra: siguienteLetra, indicador: '', valor: null }],
    })
  }
  const quitarIndicador = (idx: number, indIdx: number) => {
    const comp = form!.competencias[idx]
    const item = comp.indicadores_alcance[indIdx]
    enviarAPapelera('indicador', idx, `${item.letra}. ${item.indicador}`.trim(), item)
    const restantes = comp.indicadores_alcance
      .filter((_, i) => i !== indIdx)
      .map((ind, i) => ({ ...ind, letra: String.fromCharCode(65 + i) }))
    const genericasRestantes = comp.competencias_genericas.filter(g => !esMismaCompetencia(g, item.indicador))
    setCompetencia(idx, {
      indicadores_alcance: restantes,
      competencias_genericas: genericasRestantes,
      matriz_evaluacion: distribuirPorcentajeEvidencias(comp.matriz_evaluacion, restantes, comp.porcentaje),
    })
  }
  // El "Valor % indicador" no puede ser negativo ni hacer que la suma de todos los
  // indicadores rebase el % asignado a la unidad — se recorta al máximo disponible
  // (unidad menos lo que ya suman los demás indicadores) en vez de dejar que el usuario
  // capture un valor inválido y tenga que corregirlo a mano.
  const setIndicador = (idx: number, indIdx: number, patch: Partial<{ letra: string; indicador: string; valor: number | null }>) => {
    const comp = form!.competencias[idx]
    let valorPatch = patch
    if ('valor' in patch && patch.valor != null) {
      const sumaOtros = comp.indicadores_alcance.reduce((acc, ind, i) => i === indIdx ? acc : acc + (ind.valor ?? 0), 0)
      const restante = comp.porcentaje != null ? Math.max(0, comp.porcentaje - sumaOtros) : Infinity
      valorPatch = { ...patch, valor: Math.min(Math.max(0, patch.valor), restante) }
    }
    setCompetencia(idx, {
      indicadores_alcance: comp.indicadores_alcance.map((ind, i) => i === indIdx ? { ...ind, ...valorPatch } : ind),
    })
  }

  // Niveles de desempeño (rango numérico fijo institucional, solo se edita la descripción de indicadores)
  const setNivelDesempeno = (idx: number, nivelIdx: number, indicadores: string) =>
    setCompetencia(idx, {
      niveles_desempeno: form!.competencias[idx].niveles_desempeno.map((n, i) => i === nivelIdx ? { ...n, indicadores } : n),
    })
  // Sincroniza y actualiza los indicadores de alcance, las evidencias en la matriz y
  // la redacción de los 5 niveles de desempeño con base en las evidencias actuales de la unidad.
  const actualizarIndicadoresYNivelesUnidad = (idx: number, forzarNiveles = true) => {
    const comp = form!.competencias[idx]
    
    // 1. Sincronizar indicadores con competencias genéricas
    const indSincronizados = sincronizarIndicadoresConGenericas(comp.indicadores_alcance, comp.competencias_genericas)
    
    // 2. Extraer productos de actividades y sincronizar en matriz_evaluacion
    const productosEnActividades = comp.actividades
      .map(a => extraerProductoDeActividad(a.actividad_aprendizaje))
      .filter((p): p is string => Boolean(p && p.trim()))
    
    let nuevaMatriz: FilaMatrizEvaluacion[] = []
    if (productosEnActividades.length > 0) {
      for (const prod of productosEnActividades) {
        const yaExiste = nuevaMatriz.some(f => esMismaCompetencia(f.evidencia, prod))
        if (yaExiste) continue

        const filaPrevia = comp.matriz_evaluacion.find(f =>
          esMismaCompetencia(f.evidencia, prod) ||
          f.evidencia.toLowerCase().includes(prod.toLowerCase()) ||
          prod.toLowerCase().includes(f.evidencia.toLowerCase())
        )

        if (filaPrevia) {
          nuevaMatriz.push({ ...filaPrevia, evidencia: prod })
        } else {
          nuevaMatriz.push({
            evidencia: prod,
            porcentaje: null,
            indicadores: [],
            evaluacion_formativa: '',
          })
        }
      }
    } else {
      nuevaMatriz = [...comp.matriz_evaluacion]
    }
    
    // 3. Recalcular distribución de porcentajes
    const matrizDistribuida = distribuirPorcentajeEvidencias(nuevaMatriz, indSincronizados, comp.porcentaje)
    
    // 4. Actualizar niveles de desempeño con el listado actual de evidencias
    const listaEvidencias = matrizDistribuida.map(f => f.evidencia).filter(e => e.trim())
    const nuevosNivelesGenerados = generarNivelesDesdeEvidencias(listaEvidencias)
    
    const nivelesActualizados = comp.niveles_desempeno.map(n => {
      if (forzarNiveles || !n.indicadores.trim()) {
        return { ...n, indicadores: nuevosNivelesGenerados[n.nivel] }
      }
      return n
    })
    
    setCompetencia(idx, {
      indicadores_alcance: indSincronizados,
      matriz_evaluacion: matrizDistribuida,
      niveles_desempeno: nivelesActualizados,
    })
    
    useToastStore.getState().success('Indicadores, evidencias y niveles de desempeño actualizados.')
  }

  const hayCambiosPendientesSincronizacion = (comp: CompetenciaEspecifica): boolean => {
    // 1. ¿Hay competencias genéricas seleccionadas que no estén en indicadores_alcance?
    const todasCubiertas = comp.competencias_genericas.every(g =>
      comp.indicadores_alcance.some(ind => esMismaCompetencia(ind.indicador, g))
    )
    if (!todasCubiertas) return true
    
    // 2. ¿Hay productos en actividades que no estén en matriz_evaluacion?
    const productos = comp.actividades
      .map(a => extraerProductoDeActividad(a.actividad_aprendizaje))
      .filter((p): p is string => Boolean(p && p.trim()))
    const productosCubiertos = productos.every(p =>
      comp.matriz_evaluacion.some(f => esMismaCompetencia(f.evidencia, p))
    )
    if (!productosCubiertos) return true

    // 3. ¿Hay evidencias en la matriz que YA NO existen en las actividades?
    if (productos.length > 0) {
      const sobranEvidencias = comp.matriz_evaluacion.some(f =>
        f.evidencia.trim() && !productos.some(p => esMismaCompetencia(f.evidencia, p) || f.evidencia.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(f.evidencia.toLowerCase()))
      )
      if (sobranEvidencias) return true
    }
    
    // 4. ¿Las evidencias de la matriz están reflejadas en los niveles de desempeño?
    const evidenciasNombres = comp.matriz_evaluacion.map(f => f.evidencia.trim()).filter(Boolean)
    if (evidenciasNombres.length > 0) {
      const excelente = comp.niveles_desempeno.find(n => n.nivel === 'Excelente')?.indicadores ?? ''
      if (!excelente.trim()) return true
      const faltaAlguna = evidenciasNombres.some(e => !excelente.toLowerCase().includes(e.toLowerCase().slice(0, 8)))
      if (faltaAlguna) return true
    }
    
    return false
  }

  // Matriz de evaluación (evidencias + checklist de qué indicadores de alcance cubre cada una)
  const agregarFilaMatriz = (idx: number) => setCompetencia(idx, {
    matriz_evaluacion: [...form!.competencias[idx].matriz_evaluacion, { evidencia: '', porcentaje: null, indicadores: [], evaluacion_formativa: '' }],
  })
  const quitarFilaMatriz = (idx: number, filaIdx: number) => {
    const item = form!.competencias[idx].matriz_evaluacion[filaIdx]
    enviarAPapelera('evidencia', idx, item.evidencia, item)
    setCompetencia(idx, {
      matriz_evaluacion: form!.competencias[idx].matriz_evaluacion.filter((_, i) => i !== filaIdx),
    })
  }
  const setFilaMatriz = (idx: number, filaIdx: number, patch: Partial<{ evidencia: string; porcentaje: number | null; evaluacion_formativa: string }>) =>
    setCompetencia(idx, {
      matriz_evaluacion: form!.competencias[idx].matriz_evaluacion.map((fila, i) => i === filaIdx ? { ...fila, ...patch } : fila),
    })
  const abrirModalDisenoParaFila = (idx: number, filaIdx: number, fila: FilaMatrizEvaluacion) => {
    const comp = form!.competencias[idx]
    const actAsociada = comp.actividades.find(a => {
      const p = extraerProductoDeActividad(a.actividad_aprendizaje)
      return p && (esMismaCompetencia(p, fila.evidencia) || p.toLowerCase().includes(fila.evidencia.toLowerCase()) || fila.evidencia.toLowerCase().includes(p.toLowerCase()))
    })
    const actText = actAsociada
      ? richTextAPlano(actAsociada.actividad_aprendizaje)
      : comp.actividades.map(a => richTextAPlano(a.actividad_aprendizaje)).filter(Boolean).join(' | ')

    setModalInstrumento({
      unidadIdx: idx,
      filaIdx,
      evidencia: fila.evidencia,
      ponderacion: fila.porcentaje,
      competencia: `${cargaActual?.materia?.nombre ?? ''} — ${comp.descripcion ?? ''}`,
      actividadAprendizaje: actText,
      valorInicial: fila.evaluacion_formativa,
    })
  }
  // Al marcar/desmarcar un indicador se redistribuye automáticamente el % de cada evidencia
  // en proporción al "Valor % indicador" de los indicadores que cubre, de modo que la suma
  // siempre alcance exactamente el % asignado a la unidad (en vez de requerir captura manual
  // y cuadrar a mano).
  const toggleIndicadorEnFila = (idx: number, filaIdx: number, letra: string) => {
    const comp = form!.competencias[idx]
    const fila = comp.matriz_evaluacion[filaIdx]
    const activo = fila.indicadores.includes(letra)
    const filasActualizadas = comp.matriz_evaluacion.map((f, i) => i === filaIdx
      ? { ...f, indicadores: activo ? f.indicadores.filter(l => l !== letra) : [...f.indicadores, letra] }
      : f)
    setCompetencia(idx, { matriz_evaluacion: distribuirPorcentajeEvidencias(filasActualizadas, comp.indicadores_alcance, comp.porcentaje) })
  }

  // Fuentes de información por unidad — se capturan vía modal (el formulario cambia de
  // campos según el tipo elegido) en vez de una fila de texto libre.
  const todasLasFuentesCatalog = useMemo(() => {
    if (!form?.competencias) return []
    const mapa = new Map<string, FuenteInformacion>()
    form.competencias.forEach(c => {
      (c.fuentes_informacion ?? []).forEach(f => {
        const key = `${f.titulo.toLowerCase().trim()}_${(f.autor || '').toLowerCase().trim()}`
        if (key && !mapa.has(key)) {
          mapa.set(key, f)
        }
      })
    })
    return Array.from(mapa.values())
  }, [form?.competencias])

  const unidadesDisponiblesCatalog = useMemo(() => {
    if (!form?.competencias) return []
    return form.competencias.map((c, i) => ({
      idx: i,
      numero: c.numero_unidad || (i + 1),
      nombre: c.nombre_unidad || `Tema ${i + 1}`,
      fuentesCount: c.fuentes_informacion?.length || 0,
    }))
  }, [form?.competencias])

  const quitarFuente = (idx: number, fIdx: number) => setCompetencia(idx, {
    fuentes_informacion: form!.competencias[idx].fuentes_informacion.filter((_, i) => i !== fIdx),
  })
  const abrirModalFuente = (idx: number, fIdx: number | null, modoInicial: 'individual' | 'masivo' | 'reutilizar' = 'individual') => {
    setDraftFuente(fIdx != null ? form!.competencias[idx].fuentes_informacion[fIdx] : FUENTE_VACIA)
    setModalFuente({ idx, fIdx, modoInicial })
  }

  // Apoyos didácticos por unidad — catálogo de selección múltiple + alta de nuevos, en vez
  // de texto libre repetible, para que el docente reutilice los mismos nombres entre unidades.
  const toggleApoyo = (idx: number, nombre: string) => {
    const actuales = form!.competencias[idx].apoyos_didacticos
    setCompetencia(idx, {
      apoyos_didacticos: actuales.includes(nombre) ? actuales.filter(a => a !== nombre) : [...actuales, nombre],
    })
  }
  const agregarApoyoPersonalizado = (idx: number, nombre: string) => {
    const limpio = nombre.trim()
    if (!limpio || form!.competencias[idx].apoyos_didacticos.includes(limpio)) return
    setCompetencia(idx, { apoyos_didacticos: [...form!.competencias[idx].apoyos_didacticos, limpio] })
  }

  // Prácticas por unidad — la competencia específica se precarga con la de la unidad
  // (el docente la puede editar si esta práctica en particular apunta a otra cosa).
  const agregarPractica = (idx: number) => setCompetencia(idx, {
    practicas: [...form!.competencias[idx].practicas, {
      nombre: '', requisitos: [], semana: null, lugar: '',
      competencia_especifica: form!.competencias[idx].descripcion,
    }],
  })
  const quitarPractica = (idx: number, pIdx: number) => setCompetencia(idx, {
    practicas: form!.competencias[idx].practicas.filter((_, i) => i !== pIdx),
  })
  const setPractica = (idx: number, pIdx: number, patch: Partial<{ nombre: string; requisitos: string[]; semana: number | null; lugar: string; competencia_especifica: string }>) =>
    setCompetencia(idx, {
      practicas: form!.competencias[idx].practicas.map((p, i) => i === pIdx ? { ...p, ...patch } : p),
    })

  // Requisitos de una práctica — catálogo de selección múltiple + alta de nuevos, mismo
  // patrón que apoyos didácticos (toggleApoyo/agregarApoyoPersonalizado).
  const toggleRequisitoPractica = (idx: number, pIdx: number, nombre: string) => {
    const actuales = form!.competencias[idx].practicas[pIdx].requisitos
    setPractica(idx, pIdx, { requisitos: actuales.includes(nombre) ? actuales.filter(r => r !== nombre) : [...actuales, nombre] })
  }
  const agregarRequisitoPersonalizado = (idx: number, pIdx: number, nombre: string) => {
    const limpio = nombre.trim()
    const actuales = form!.competencias[idx].practicas[pIdx].requisitos
    if (!limpio || actuales.includes(limpio)) return
    setPractica(idx, pIdx, { requisitos: [...actuales, limpio] })
  }

  // La dosificación ya no se captura a mano: se recalcula automáticamente a partir de las
  // horas T/P de cada fila de actividades (ver el efecto de sincronización más abajo).

  const mutSave = useMutation({
    mutationFn: () => academicoApi.savePlaneacion({
      ...form,
      carga_academica_id: cargaId,
      periodo_id: periodoId,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-planeaciones'] })
    },
    onError: (e) => toast.error(mutationError(e)),
  })

  const { data: versiones = [], isLoading: cargandoVersiones } = useQuery({
    queryKey: ['planeacion-versiones', planeacionActual?.id],
    queryFn: () => academicoApi.versionesPlaneacion(planeacionActual!.id),
    enabled: modalHistorialAbierto && !!planeacionActual?.id,
  })

  const { data: comparativa, isLoading: cargandoComparativa } = useQuery({
    queryKey: ['comparar-grupos', cargaId],
    queryFn: () => academicoApi.compararGruposPlaneacion(cargaId),
    enabled: modalCompararAbierto && !!cargaId,
  })

  const mutRestaurar = useMutation({
    mutationFn: (versionId: string) => academicoApi.restaurarVersionPlaneacion(planeacionActual!.id, versionId),
    onSuccess: (planeacionRestaurada) => {
      qc.invalidateQueries({ queryKey: ['mis-planeaciones'] })
      qc.invalidateQueries({ queryKey: ['planeacion-versiones', planeacionActual?.id] })
      setModalHistorialAbierto(false)
      toast.success('Versión restaurada.')
      // El estado del editor viene de `form`, sembrado a partir de la planeación cargada —
      // se recarga la página para que todo el árbol (competencias, dosificación calculada,
      // etc.) se reconstruya limpio a partir del contenido restaurado, en vez de intentar
      // reconciliar a mano un estado potencialmente muy distinto al que había en pantalla.
      void planeacionRestaurada
      window.location.reload()
    },
    onError: (e) => toast.error(mutationError(e)),
  })

  // La dosificación (semana_inicio/semana_fin por subtema) ya no la captura el docente a
  // mano: se recalcula sola cada vez que cambian temas/subtemas, filas de actividades u
  // horas T/P, conservando el `semana_realizado` que haya confirmado Desarrollo Académico.
  // La comparación por JSON evita reescribir el estado (y disparar el autoguardado) cuando
  // el resultado recalculado es idéntico al actual, para no entrar en bucle.
  useEffect(() => {
    if (!cargado || !form) return
    const recalculada = generarDosificacionAutomatica(form.competencias, cargaActual?.materia)
    const cambio = form.competencias.some((c, i) => JSON.stringify(c.dosificacion) !== JSON.stringify(recalculada[i]))
    if (!cambio) return
    setForm(f => f ? {
      ...f,
      competencias: f.competencias.map((c, i) => ({ ...c, dosificacion: recalculada[i] })),
    } : f)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargado, form, cargaActual?.materia])

  // Autoguardado: cada cambio en el formulario se guarda solo, sin que el docente tenga
  // que presionar un botón — con un pequeño debounce para no disparar una petición por tecla.
  // La bandera evita que el primer valor sembrado (formDesdePlaneacion/formDesdeMateria) se
  // vuelva a guardar de inmediato como si fuera una edición del docente.
  const primerFormRef = useRef(true)
  useEffect(() => {
    if (!cargado || !form || soloLectura) return
    if (primerFormRef.current) { primerFormRef.current = false; return }
    const t = setTimeout(() => mutSave.mutate(), 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, cargado])

  // Siembra el formulario la primera vez que AMBAS consultas (cargas y planeaciones) ya
  // resolvieron — desde la planeación guardada si existe, o desde la materia estandarizada
  // si es una instrumentación nueva. Debe esperar a las dos: si solo se espera a "cargas",
  // una respuesta más lenta de "planeaciones" haría sembrar el formulario vacío y esa carrera
  // (race condition) quedaría fija con "cargado=true", perdiendo silenciosamente el contenido
  // ya guardado hasta que el docente guardara y sobrescribiera su propia planeación con vacío.
  // Se deriva directo del render (sin useEffect) siguiendo el patrón ya usado en este módulo.
  if (!cargado && periodoId && cargaId && cargasListas && planeacionesListas) {
    setCargado(true)
    setForm(planeacionActual ? formDesdePlaneacion(planeacionActual) : formDesdeMateria(cargaActual?.materia))
  }

  const puedeEnviar = planeacionActual &&
    ['borrador', 'devuelta_da', 'devuelta_jc'].includes(planeacionActual.estatus)

  const todoCompleto = !!form && PASOS.every(p => pasoCompleto(p.id, form))

  // Antes de llevar al docente a la página de confirmación, se fuerza un guardado
  // inmediato (sin esperar el debounce del autoguardado) para que lo que revise ahí
  // sea exactamente lo último que capturó.
  const irARevisar = () => {
    mutSave.mutate(undefined, {
      onSuccess: () => navigate(`/docente/planeacion/${cargaId}/confirmar?periodo=${periodoId}`),
    })
  }

  if (!periodoId || !cargaId) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div>
          <p className="text-sm text-slate-500">Falta información para abrir esta instrumentación didáctica.</p>
          <Link to={periodoId ? `/docente/planeacion?periodo=${periodoId}` : '/docente/planeacion'} className="text-sm text-brand-600 hover:underline">← Volver a Mis asignaturas</Link>
        </div>
      </div>
    )
  }

  const porcentajeCompleto = form ? Math.round((PASOS.filter(p => pasoCompleto(p.id, form)).length / PASOS.length) * 100) : 0

  // Arrastre de la columna "Tema / Subtema" del Gantt (ver anchoColumnaTema arriba).
  const iniciarResizeColumnaTema = (e: React.MouseEvent) => {
    e.preventDefault()
    arrastrandoColumnaTema.current = true
    const xInicial = e.clientX
    const anchoInicial = anchoColumnaTema

    const mover = (ev: MouseEvent) => {
      if (!arrastrandoColumnaTema.current) return
      const nuevo = Math.min(400, Math.max(64, anchoInicial + (ev.clientX - xInicial)))
      setAnchoColumnaTema(nuevo)
    }
    const soltar = () => {
      arrastrandoColumnaTema.current = false
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-b from-slate-50 via-white to-white min-h-screen -mt-8 pt-8" data-modulo-planeacion>
    <div className="space-y-6">
      <Link to={`/docente/planeacion?periodo=${periodoId}`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Mis asignaturas
      </Link>

      {!form ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 flex items-center justify-center">
          <svg className="w-5 h-5 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-3 text-sm text-slate-400">Cargando instrumentación…</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/70">
          {/* rounded-t-2xl en vez de overflow-hidden en el contenedor: así el menú
              desplegable "Más acciones" (más abajo, position absolute) no se corta contra
              el borde de la tarjeta. */}
          <div className="h-1.5 rounded-t-2xl bg-gradient-to-r from-brand-600 via-sky-500 to-emerald-400" />
          <div className="p-5 space-y-6">

          {/* Barra informativa — colapsable para aprovechar el espacio vertical; las
              notificaciones de guardado/errores ya no viven aquí, se muestran como toasts. */}
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-xl px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setInfoAbierta(v => !v)}
                className="flex items-center gap-2 min-w-0 text-left"
              >
                <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${infoAbierta ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-semibold text-slate-800 truncate">{cargaActual?.materia?.nombre ?? 'Instrumentación didáctica'}</span>
                {planeacionActual && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap shadow-sm ${ESTATUS_COLOR[planeacionActual.estatus]}`}>
                    {ESTATUS_LABEL[planeacionActual.estatus]}
                  </span>
                )}
                {!soloLectura && (
                  <span className={`flex items-center gap-1 text-[11px] font-medium whitespace-nowrap ${
                    mutSave.isPending ? 'text-slate-400' : mutSave.isError ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {mutSave.isPending ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Guardando…
                      </>
                    ) : mutSave.isError ? (
                      'Error al guardar'
                    ) : mutSave.isSuccess ? (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Guardado
                      </>
                    ) : null}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setGuiaAbierta(true)}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap"
                title="Indicaciones oficiales para desarrollar la instrumentación didáctica"
              >
                <CircleHelp className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
                Guía de llenado
              </button>

              {/* Guía del formato del SGC: se abre en la indicación de lo que se está llenando. */}
              <GuiaInstrumentacionPanel
                abierto={guiaAbierta}
                onCerrar={() => setGuiaAbierta(false)}
                seccionInicial={
                  paso === 'generales' ? '1'
                    : paso === 'calendario_horas' ? '4.7'
                    : paso === 'calendarizacion_evaluacion' ? '6'
                    : vistaCompetencia ? SECCION_GUIA_POR_CATEGORIA[vistaCompetencia.cat]
                    : '4'
                }
              />

              {planeacionActual && (
                <>
                  <button
                    type="button"
                    onClick={abrirVistaPrevia}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap"
                    title="Vista previa de la instrumentación didáctica"
                  >
                    <svg className="w-3.5 h-3.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Vista previa
                  </button>

                  <details ref={menuAccionesRef} className="relative">
                    <summary
                      className="list-none cursor-pointer select-none flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap transition-all"
                    >
                      Más acciones
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 text-xs">
                      <button type="button"
                        onClick={e => { abrirVistaPrevia(); e.currentTarget.closest('details')?.removeAttribute('open') }}
                        className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50 flex items-center gap-2 font-medium text-brand-600">
                        <svg className="w-3.5 h-3.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Vista previa del documento
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button type="button"
                        onClick={e => { setModalHistorialAbierto(true); e.currentTarget.closest('details')?.removeAttribute('open') }}
                        className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50">
                        Historial
                      </button>
                    <button type="button"
                      onClick={e => { setModalCompararAbierto(true); e.currentTarget.closest('details')?.removeAttribute('open') }}
                      className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50">
                      Comparar grupos
                    </button>
                    {papelera.length > 0 && (
                      <button type="button"
                        onClick={e => { setModalPapeleraAbierto(true); e.currentTarget.closest('details')?.removeAttribute('open') }}
                        className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50">
                        Papelera <span className="text-slate-400">({papelera.length})</span>
                      </button>
                    )}
                    <div className="my-1 border-t border-slate-100" />
                    {esSuperAdmin && (
                      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Fecha de emisión (PDF):
                        </label>
                        <input
                          type="date"
                          value={fechaEmisionPdf || (planeacionActual?.entregada_en ? planeacionActual.entregada_en.substring(0, 10) : new Date().toISOString().substring(0, 10))}
                          onChange={(e) => setFechaEmisionPdf(e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    )}
                    <button type="button" disabled={descargandoPdfInstrumentacion}
                      onClick={e => { descargarPdfInstrumentacion(); e.currentTarget.closest('details')?.removeAttribute('open') }}
                      className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                      {descargandoPdfInstrumentacion ? 'Generando…' : 'Descargar instrumentación (PDF)'}
                    </button>
                    <button type="button" disabled={descargandoDocxInstrumentacion}
                      onClick={e => { descargarDocxInstrumentacion(); e.currentTarget.closest('details')?.removeAttribute('open') }}
                      className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                      {descargandoDocxInstrumentacion ? 'Generando…' : 'Descargar (Word)'}
                    </button>
                  </div>
                </details>
                </>
              )}

              {!soloLectura && puedeEnviar && (
                todoCompleto ? (
                  <button
                    type="button"
                    onClick={irARevisar}
                    className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-sm shadow-green-600/30 hover:bg-green-700 hover:shadow-md whitespace-nowrap transition-all"
                  >
                    Revisar y enviar →
                  </button>
                ) : (
                  <span className="text-[11px] text-amber-600 text-right max-w-[220px]">
                    Completa las {PASOS.length} fases para poder enviar la instrumentación.
                  </span>
                )
              )}
            </div>

            {infoAbierta && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs mt-3 pt-3 border-t border-slate-100">
                <div><span className="text-slate-400">Periodo</span><p className="font-medium text-slate-800">{periodoActual?.nombre}</p></div>
                <div><span className="text-slate-400">Plan de estudios</span><p className="font-medium text-slate-800">{cargaActual?.materia?.carrera?.nombre ?? '—'}</p></div>
                <div><span className="text-slate-400">Clave</span><p className="font-medium text-slate-800">{cargaActual?.materia?.clave}</p></div>
                <div>
                  <span className="text-slate-400">Horas teoría-práctica-créditos</span>
                  <p className="font-medium text-slate-800">
                    {cargaActual?.materia?.horas_teoria}-{cargaActual?.materia?.horas_practica}-{cargaActual?.materia?.creditos}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Observaciones de revisión */}
          {planeacionActual?.observaciones_revision && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold text-xs mb-1">Observaciones del revisor:</p>
              {planeacionActual.observaciones_revision}
            </div>
          )}

          {/* Navegación por fases — fija arriba al hacer scroll para poder cambiar de fase
              sin tener que subir hasta el inicio del formulario. */}
          <div className="sticky top-0 z-20 -mx-5 px-5 py-2 bg-white/95 backdrop-blur-sm border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${porcentajeCompleto === 100 ? 'bg-emerald-500' : 'bg-brand-600'}`}
                style={{ width: `${porcentajeCompleto}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 tabular-nums shrink-0">{porcentajeCompleto}% completo</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2">
            <button
              type="button"
              aria-label="Fase anterior"
              title={PASOS[Math.max(0, PASOS.findIndex(p => p.id === paso) - 1)].label}
              onClick={() => { cambiarPaso(PASOS[Math.max(0, PASOS.findIndex(p => p.id === paso) - 1)].id); setVistaCompetencia(null) }}
              disabled={paso === PASOS[0].id}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 bg-white border border-slate-200 shadow-sm hover:bg-slate-100 disabled:opacity-30 disabled:shadow-none disabled:hover:bg-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex flex-wrap gap-1.5 flex-1">
              {PASOS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { cambiarPaso(p.id); setVistaCompetencia(null) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    paso === p.id ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    paso === p.id ? 'bg-white/20' : pasoCompleto(p.id, form) ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'
                  }`}>
                    {pasoCompleto(p.id, form) && paso !== p.id ? '✓' : p.numero}
                  </span>
                  {p.label}
                  {pasoTieneObservacion(p.id) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Tiene observaciones del revisor" />
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              aria-label="Siguiente fase"
              title={PASOS[Math.min(PASOS.length - 1, PASOS.findIndex(p => p.id === paso) + 1)].label}
              onClick={() => { cambiarPaso(PASOS[Math.min(PASOS.length - 1, PASOS.findIndex(p => p.id === paso) + 1)].id); setVistaCompetencia(null) }}
              disabled={paso === PASOS[PASOS.length - 1].id}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white bg-brand-600 hover:bg-[#234d7a] disabled:opacity-30 disabled:hover:bg-brand-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          {paso === 'calendario_horas' && (() => {
            const objetivo = horasObjetivo(cargaActual?.materia)
            const capturado = totalHorasCapturadas(form.competencias)
            const faltanTotal = Math.round(((objetivo.teoria + objetivo.practica) - (capturado.teoria + capturado.practica)) * 100) / 100
            return (
              <div className="flex items-center gap-3 mt-1.5 px-1 text-[11px]">
                <span className={`font-medium ${faltanTotal <= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                  {faltanTotal <= 0 ? 'Horas completas' : `Faltan ${faltanTotal}h de ${objetivo.teoria + objetivo.practica}h`}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-400">T: {capturado.teoria}h de {objetivo.teoria}h — P: {capturado.practica}h de {objetivo.practica}h</span>
              </div>
            )
          })()}
          </div>

          {/* 1-3. Caracterización, intención didáctica y competencia de la asignatura */}
          {paso === 'generales' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm shadow-slate-200/50 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] font-semibold flex items-center justify-center shadow-sm">1</span>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Caracterización de la asignatura</label>
              </div>
              <NotaRevisor items={obsPara('caracterizacion')} />
              <RichTextField value={form.caracterizacion} onChange={html => set('caracterizacion', html)}
                placeholder="Aportación al perfil profesional, importancia, relación con otras asignaturas…"
                disabled={soloLectura} />
              {planeacionActual && <HiloComentarios planeacionId={planeacionActual.id} seccion="caracterizacion" />}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm shadow-slate-200/50 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] font-semibold flex items-center justify-center shadow-sm">2</span>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Intención didáctica</label>
              </div>
              <NotaRevisor items={obsPara('intencion_didactica')} />
              <RichTextField value={form.intencion_didactica} onChange={html => set('intencion_didactica', html)}
                placeholder="Forma de abordar los contenidos, enfoque, competencias genéricas a desarrollar…"
                disabled={soloLectura} />
              {planeacionActual && <HiloComentarios planeacionId={planeacionActual.id} seccion="intencion_didactica" />}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm shadow-slate-200/50 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] font-semibold flex items-center justify-center shadow-sm">3</span>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Competencia de la asignatura</label>
              </div>
              <NotaRevisor items={obsPara('competencia_asignatura')} />
              <RichTextField value={form.competencia_asignatura} onChange={html => set('competencia_asignatura', html)}
                placeholder="¿Qué debe saber y saber hacer el estudiante como resultado de la asignatura?"
                minHeight={60} disabled={soloLectura} />
              {planeacionActual && <HiloComentarios planeacionId={planeacionActual.id} seccion="competencia_asignatura" />}
            </div>
          </div>
          )}

          {/* 4. Análisis por competencias específicas (una por unidad) */}
          {paso === 'especificas' && (() => {
            const vc = vistaCompetencia
            const comp = vc ? form.competencias[vc.idx] : null

            // ── Subvista: una categoría de una unidad ───────────────────────
            if (vc && comp) {
              const idx = vc.idx
              return (
                <div>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <nav className="flex items-center gap-1.5 text-xs min-w-0">
                      <button type="button" onClick={() => setVistaCompetencia(null)}
                        className="flex items-center gap-1 font-medium text-brand-600 hover:underline shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Competencias específicas
                      </button>
                      <span className="text-slate-300 shrink-0">/</span>
                      <span className="text-slate-500 truncate">Tema {comp.numero}{comp.nombre_unidad ? ` — ${comp.nombre_unidad}` : ''}</span>
                      <span className="text-slate-300 shrink-0">/</span>
                      <span className="font-medium text-slate-700 shrink-0">{CATEGORIAS.find(c => c.id === vc.cat)?.label}</span>
                    </nav>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" disabled={idx === 0}
                        title={idx > 0 ? `Tema ${form.competencias[idx - 1].numero}${form.competencias[idx - 1].nombre_unidad ? ` — ${form.competencias[idx - 1].nombre_unidad}` : ''}` : undefined}
                        onClick={() => setVistaCompetencia({ idx: idx - 1, cat: vc.cat })}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">
                        ‹
                      </button>
                      <span className="text-xs text-slate-400">Tema {idx + 1} de {form.competencias.length}</span>
                      <button type="button" disabled={idx === form.competencias.length - 1}
                        title={idx < form.competencias.length - 1 ? `Tema ${form.competencias[idx + 1].numero}${form.competencias[idx + 1].nombre_unidad ? ` — ${form.competencias[idx + 1].nombre_unidad}` : ''}` : undefined}
                        onClick={() => setVistaCompetencia({ idx: idx + 1, cat: vc.cat })}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">
                        ›
                      </button>
                    </div>
                  </div>

                  {/* Selector de unidad + categoría — agrupados en un panel con fondo propio
                      para separarlos visualmente del contenido de abajo. */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4">
                    {form.competencias.length > 1 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Tema</p>
                        <div className="flex flex-wrap gap-1.5">
                          {form.competencias.map((c, i) => {
                            const completa = CATEGORIAS.every(cat => categoriaCompleta(c, cat.id))
                            return (
                              <button key={i} type="button" onClick={() => setVistaCompetencia({ idx: i, cat: vc.cat })}
                                title={c.nombre_unidad ? `Tema ${c.numero} — ${c.nombre_unidad}` : `Tema ${c.numero}`}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all max-w-[110px] ${
                                  i === idx ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/25' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                }`}>
                                <span className="truncate">Tema {c.numero}</span>
                                {completa && (
                                  <span className={`shrink-0 w-3 h-3 rounded-full text-[8px] flex items-center justify-center ${i === idx ? 'bg-white/25' : 'bg-green-500 text-white'}`}>✓</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {form.competencias.length > 1 && <div className="h-px bg-slate-200 mb-3" />}

                    {/* Selector de categoría — cambia de sección manteniendo el tema actual. Se
                        distingue a propósito de la fila de "Tema" de arriba (etiqueta, separador,
                        y un estilo de pill distinto con ring azul) para que no se confundan. */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Sección</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORIAS.map(cat => (
                          <button key={cat.id} type="button" onClick={() => setVistaCompetencia({ idx, cat: cat.id })}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                              cat.id === vc.cat ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200 shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }`}>
                            {categoriaCompleta(comp, cat.id) && <span className="w-3.5 h-3.5 rounded-full bg-green-500 text-white text-[9px] flex items-center justify-center shrink-0">✓</span>}
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
                    <BadgesHoras comp={comp} materia={cargaActual?.materia} />
                  </div>

                  <NotaRevisor items={obsPara('especifica', { unidad: comp.numero, categoria: vc.cat })} />
                  {planeacionActual && <HiloComentarios planeacionId={planeacionActual.id} seccion="especifica" unidad={comp.numero} categoria={vc.cat} />}

                  {/* Materia + competencia específica de esta unidad — se manda como contexto a las
                      sugerencias de IA de esta unidad para que no salgan genéricas (dos materias
                      distintas con actividades parecidas, p. ej. "investigar y exponer un tema",
                      terminaban recibiendo la misma sugerencia sin ningún indicio de a qué
                      asignatura pertenecen). */}
                  {vc.cat === 'analisis' && (() => {
                  const contextoIa = [cargaActual?.materia?.nombre, richTextAPlano(comp.descripcion)].filter(Boolean).join(' — ')
                  // Evidencias de aprendizaje ya capturadas en esta unidad (pestaña Indicadores
                  // y evaluación) — se le piden al modelo como contexto para "Mejorar con IA" de
                  // actividad de aprendizaje, y se resaltan en la sugerencia resultante si el
                  // modelo las menciona (ver PanelSugerenciasIA en tabs/shared.tsx).
                  const evidenciasUnidad = comp.matriz_evaluacion.map(f => f.evidencia).filter(e => e.trim())
                  const contextoAprendizaje = evidenciasUnidad.length
                    ? [contextoIa, `Evidencias de aprendizaje esperadas: ${evidenciasUnidad.join(', ')}`].filter(Boolean).join(' | ')
                    : contextoIa
                  return (
                    <div className="space-y-5">
                      <Field label="Competencia específica (descripción)">
                        <RichTextField value={comp.descripcion} onChange={html => setCompetencia(idx, { descripcion: html })}
                          minHeight={60} disabled={soloLectura} />
                      </Field>

                      {/* Temas y subtemas, cada uno asociado a la fila (N) de actividades que le corresponde
                          — va antes de la tabla de actividades porque primero se definen los temas y luego
                          se les asigna la fila de actividades/horas que les corresponde. */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium text-slate-600">Temas y subtemas</p>
                          {!soloLectura && (
                            <button type="button" onClick={() => agregarSubtemaTema(idx)} className="text-xs text-brand-600 hover:underline">+ Agregar subtema</button>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {comp.subtemas.map((s, sIdx) => {
                            const primerFila = obtenerFilasDeSubtema(s)[0]
                            return (
                              <div key={sIdx} className={`flex items-center gap-2 rounded-lg px-1.5 py-1 -mx-1.5 ${colorFila(primerFila)}`}>
                                <SelectorFilasSubtema
                                  subtema={s}
                                  actividades={comp.actividades}
                                  disabled={soloLectura}
                                  onChange={nuevasFilas => setSubtemaTema(idx, sIdx, { filas: nuevasFilas, fila: nuevasFilas[0] ?? null })}
                                />
                                <input value={s.texto} onChange={e => setSubtemaTema(idx, sIdx, { texto: e.target.value })}
                                  placeholder="Tema o subtema" className={smallInputCls + ' flex-1'} disabled={soloLectura} />
                                {!soloLectura && (
                                  <button type="button" onClick={() => quitarSubtemaTema(idx, sIdx)} className="text-xs text-red-600 hover:underline shrink-0">Quitar</button>
                                )}
                              </div>
                            )
                          })}
                          {comp.subtemas.length === 0 && (
                            <p className="text-xs text-slate-400">Sin temas ni subtemas registrados.</p>
                          )}
                        </div>
                      </div>

                      {/* N — Actividades de enseñanza / aprendizaje, por fila numerada */}
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                          <div>
                            <p className="text-xs font-semibold text-slate-700">Actividades de enseñanza y aprendizaje</p>
                            <p className="text-[11px] text-slate-500">Redacta las actividades formativas, define productos entregables y asigna horas teóricas/prácticas.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Selector rápido de proporción de ancho de columnas */}
                            <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-xs">
                              <span className="px-1 text-slate-500 font-medium">Ancho:</span>
                              {[
                                { label: '50/50', val: 50 },
                                { label: '40/60', val: 40 },
                                { label: '30/70', val: 30 },
                                { label: '60/40', val: 60 },
                              ].map(p => (
                                <button
                                  key={p.val}
                                  type="button"
                                  onClick={() => setAnchoColEnsenanza(p.val)}
                                  title={`Ajustar ${p.val}% Enseñanza / ${100 - p.val}% Aprendizaje`}
                                  className={`px-1.5 py-0.5 rounded transition-colors ${
                                    anchoColEnsenanza === p.val
                                      ? 'bg-white text-slate-800 font-bold shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                            {!soloLectura && (
                              <button type="button" onClick={() => agregarActividad(idx)} className="text-xs font-medium text-brand-600 bg-brand-50 border border-brand-100 rounded-lg px-2.5 py-1 hover:bg-brand-100 transition-colors">+ Agregar fila</button>
                            )}
                          </div>
                        </div>
                        {comp.actividades.length === 0 ? (
                          <p className="text-xs text-slate-400">Sin filas registradas.</p>
                        ) : (
                          <>
                            {/* Pantallas pequeñas: tarjetas apiladas */}
                            <div className="sm:hidden space-y-2.5">
                              {comp.actividades.map((a, aIdx) => {
                                const semanas = semanasDeFila(comp, a.numero)
                                const tieneSubtema = comp.subtemas.some(s => subtemaPerteneceAFila(s, a.numero))
                                const prodFila = extraerProductoDeActividad(a.actividad_aprendizaje)
                                const ctxFila = [contextoAprendizaje, prodFila ? `Producto entregable de la actividad: ${prodFila}` : null].filter(Boolean).join(' | ')
                                const resFila = Array.from(new Set([...evidenciasUnidad, ...(prodFila ? [prodFila] : [])])).filter(Boolean)
                                return (
                                  <div key={aIdx} className={`border border-slate-100 rounded-lg p-2.5 space-y-2 ${tieneSubtema ? colorFila(a.numero) : 'bg-white'}`}>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="inline-flex w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold items-center justify-center shrink-0">{a.numero}</span>
                                      {!soloLectura && (
                                        <button type="button" onClick={() => quitarActividad(idx, aIdx)} className="text-xs text-red-600 hover:underline">Quitar</button>
                                      )}
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Actividad de enseñanza</label>
                                      <RichTextField value={a.actividad_ensenanza} onChange={html => setActividad(idx, aIdx, { actividad_ensenanza: html })}
                                        minHeight={50} disabled={soloLectura} />
                                      {!soloLectura && (
                                        <>
                                          <SugerirActividadEnsenanza aprendizaje={a.actividad_aprendizaje} contexto={contextoIa} onAplicar={t => aplicarMejoraEnsenanza(idx, aIdx, t)} />
                                          <br />
                                          <MejorarConIa texto={richTextAPlano(a.actividad_ensenanza)} tipo="actividad" contexto={contextoIa} onAplicar={t => aplicarMejoraEnsenanza(idx, aIdx, t)} />
                                        </>
                                      )}
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Actividad de aprendizaje</label>
                                      <RichTextField value={a.actividad_aprendizaje} onChange={html => setActividad(idx, aIdx, { actividad_aprendizaje: html })}
                                        minHeight={50} disabled={soloLectura} />
                                    </div>
                                    {!soloLectura && (
                                      <>
                                        <SelectorProductoAprendizaje
                                          ensenanza={a.actividad_ensenanza}
                                          aprendizaje={a.actividad_aprendizaje}
                                          contexto={contextoIa}
                                          productoActual={extraerProductoDeActividad(a.actividad_aprendizaje)}
                                          onSeleccionar={prod => aplicarProductoAActividad(idx, aIdx, prod)}
                                          onQuitar={() => quitarProductoDeActividad(idx, aIdx)}
                                          disabled={soloLectura}
                                        />
                                        <div className="mt-1">
                                          <MejorarConIa texto={richTextAPlano(a.actividad_aprendizaje)} tipo="actividad_aprendizaje"
                                            contexto={ctxFila} resaltar={resFila}
                                            onAplicar={(t, ev) => aplicarMejoraAprendizaje(idx, aIdx, t, ev)} />
                                        </div>
                                      </>
                                    )}
                                    {/* Fila unificada de Horas y Semanas en móvil */}
                                    <div className="flex items-center justify-between gap-2 p-2 bg-slate-50/80 rounded-md border border-slate-100">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1" title="Horas teóricas">
                                          <span className="shrink-0 w-4 h-4 rounded bg-brand-100 text-brand-700 text-[9px] font-bold flex items-center justify-center">T</span>
                                          <input type="number" min="0" placeholder="0" value={a.horas_teoricas ?? ''}
                                            onChange={e => setActividad(idx, aIdx, { horas_teoricas: e.target.value === '' ? null : Number(e.target.value) })}
                                            className={smallInputCls + ' !w-12 !px-1 text-center'} disabled={soloLectura} />
                                        </div>
                                        <div className="flex items-center gap-1" title="Horas prácticas">
                                          <span className="shrink-0 w-4 h-4 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold flex items-center justify-center">P</span>
                                          <input type="number" min="0" placeholder="0" value={a.horas_practicas ?? ''}
                                            onChange={e => setActividad(idx, aIdx, { horas_practicas: e.target.value === '' ? null : Number(e.target.value) })}
                                            className={smallInputCls + ' !w-12 !px-1 text-center'} disabled={soloLectura} />
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 flex-wrap justify-end">
                                        {semanas.length > 0 ? (
                                          semanas.map(s => (
                                            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 font-medium whitespace-nowrap">{s}</span>
                                          ))
                                        ) : (
                                          <span className="text-[10px] text-amber-600 font-medium">Sin dosificar</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {/* sm en adelante: tabla con columnas redimensionables y Horas/Semanas ultra-compacta */}
                            <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                              <table ref={tablaActividadesRef} className="w-full text-xs table-fixed border-collapse">
                                <colgroup>
                                  <col style={{ width: '36px' }} />
                                  <col style={{ width: `calc((100% - 108px) * ${anchoColEnsenanza / 100})` }} />
                                  <col style={{ width: `calc((100% - 108px) * ${(100 - anchoColEnsenanza) / 100})` }} />
                                  <col style={{ width: '72px' }} />
                                </colgroup>
                                <thead className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border-b border-slate-200 select-none">
                                  <tr>
                                    <th className="px-2 py-2 text-center font-semibold text-slate-500 w-8">N</th>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-700 relative">
                                      <div className="flex items-center justify-between">
                                        <span>Actividades de enseñanza</span>
                                        <span className="text-[10px] text-slate-400 font-normal">{anchoColEnsenanza}%</span>
                                      </div>
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-700 relative border-l border-slate-200">
                                      {/* Manija divisoria arrastrable para redimensionar */}
                                      <div
                                        onMouseDown={iniciarArrastreColumna}
                                        title="Arrastra a los lados para redimensionar el ancho de las columnas"
                                        className={`absolute -left-2 top-0 bottom-0 w-4 cursor-col-resize z-10 flex items-center justify-center group ${
                                          arrastrandoResizer ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                                        }`}
                                      >
                                        <div className="w-1 h-full bg-slate-300 group-hover:bg-sky-500 rounded-full transition-colors" />
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span>Actividades de aprendizaje</span>
                                        <span className="text-[10px] text-slate-400 font-normal">{100 - anchoColEnsenanza}%</span>
                                      </div>
                                    </th>
                                    <th className="px-1 py-2 text-center font-semibold text-slate-700 border-l border-slate-200 w-[72px]" title="Horas teóricas/prácticas y semanas del periodo">
                                      H · Sem
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {comp.actividades.map((a, aIdx) => {
                                    const semanas = semanasDeFila(comp, a.numero)
                                    const tieneSubtema = comp.subtemas.some(s => subtemaPerteneceAFila(s, a.numero))
                                    const prodFila = extraerProductoDeActividad(a.actividad_aprendizaje)
                                    const ctxFila = [contextoAprendizaje, prodFila ? `Producto entregable de la actividad: ${prodFila}` : null].filter(Boolean).join(' | ')
                                    const resFila = Array.from(new Set([...evidenciasUnidad, ...(prodFila ? [prodFila] : [])])).filter(Boolean)
                                    return (
                                    <tr key={aIdx} className={tieneSubtema ? colorFila(a.numero) : 'hover:bg-slate-50/50'}>
                                      <td className="px-2 py-2 text-center align-top">
                                        <span className="inline-flex w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold items-center justify-center">{a.numero}</span>
                                      </td>
                                      <td className="px-3 py-2 align-top">
                                        <RichTextField value={a.actividad_ensenanza} onChange={html => setActividad(idx, aIdx, { actividad_ensenanza: html })}
                                          minHeight={50} disabled={soloLectura} />
                                        {!soloLectura && (
                                          <div className="mt-1">
                                            <SugerirActividadEnsenanza aprendizaje={a.actividad_aprendizaje} contexto={contextoIa} onAplicar={t => aplicarMejoraEnsenanza(idx, aIdx, t)} />
                                            <span className="mx-1 text-slate-300">·</span>
                                            <MejorarConIa texto={richTextAPlano(a.actividad_ensenanza)} tipo="actividad" contexto={contextoIa} onAplicar={t => aplicarMejoraEnsenanza(idx, aIdx, t)} />
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 align-top border-l border-slate-100">
                                        <RichTextField value={a.actividad_aprendizaje} onChange={html => setActividad(idx, aIdx, { actividad_aprendizaje: html })}
                                          minHeight={50} disabled={soloLectura} />
                                        {!soloLectura && (
                                          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                                            <SelectorProductoAprendizaje
                                              ensenanza={a.actividad_ensenanza}
                                              aprendizaje={a.actividad_aprendizaje}
                                              contexto={contextoIa}
                                              productoActual={extraerProductoDeActividad(a.actividad_aprendizaje)}
                                              onSeleccionar={prod => aplicarProductoAActividad(idx, aIdx, prod)}
                                              onQuitar={() => quitarProductoDeActividad(idx, aIdx)}
                                              disabled={soloLectura}
                                            />
                                            <div>
                                              <MejorarConIa texto={richTextAPlano(a.actividad_aprendizaje)} tipo="actividad_aprendizaje"
                                                contexto={ctxFila} resaltar={resFila}
                                                onAplicar={(t, ev) => aplicarMejoraAprendizaje(idx, aIdx, t, ev)} />
                                            </div>
                                          </div>
                                        )}
                                      </td>
                                      {/* Columna ultra-compacta en pila: T, P, Sem y Quitar integrado */}
                                      <td className="px-1.5 py-2 border-l border-slate-100 align-top bg-slate-50/40">
                                        <div className="flex flex-col items-center gap-1.5 w-full">
                                          {/* T (Horas teóricas) */}
                                          <div className="flex items-center justify-between w-full gap-1" title="Horas teóricas">
                                            <span className="shrink-0 w-4 h-4 rounded bg-brand-100 text-brand-700 text-[9px] font-bold flex items-center justify-center">T</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={a.horas_teoricas ?? ''}
                                              onChange={e => setActividad(idx, aIdx, { horas_teoricas: e.target.value === '' ? null : Number(e.target.value) })}
                                              className="w-8 h-5 px-0.5 text-center text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded focus:border-brand-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                              disabled={soloLectura}
                                            />
                                          </div>

                                          {/* P (Horas prácticas) */}
                                          <div className="flex items-center justify-between w-full gap-1" title="Horas prácticas">
                                            <span className="shrink-0 w-4 h-4 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold flex items-center justify-center">P</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="0"
                                              value={a.horas_practicas ?? ''}
                                              onChange={e => setActividad(idx, aIdx, { horas_practicas: e.target.value === '' ? null : Number(e.target.value) })}
                                              className="w-8 h-5 px-0.5 text-center text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded focus:border-emerald-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                              disabled={soloLectura}
                                            />
                                          </div>

                                          {/* Semanas asignadas desde dosificación en pila */}
                                          <div className="w-full pt-1 border-t border-slate-200/70 flex flex-col items-center gap-0.5">
                                            {semanas.length > 0 ? (
                                              semanas.map(s => (
                                                <span key={s} className="text-[9px] px-1 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-medium whitespace-nowrap shadow-2xs w-full text-center">
                                                  {s}
                                                </span>
                                              ))
                                            ) : (
                                              <span className="text-[8px] text-amber-600 font-medium text-center leading-tight" title="Liga esta fila a un subtema con semanas en la pestaña Dosificación">
                                                Sin dosificar
                                              </span>
                                            )}
                                          </div>

                                          {/* Botón Quitar integrado */}
                                          {!soloLectura && (
                                            <button
                                              type="button"
                                              onClick={() => quitarActividad(idx, aIdx)}
                                              title="Quitar fila de actividad"
                                              className="inline-flex items-center justify-center gap-0.5 text-[10px] text-slate-400 hover:text-red-600 transition-colors pt-1 border-t border-slate-200/50 w-full"
                                            >
                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                              <span>Quitar</span>
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Desarrollo de competencias genéricas con edición y alta de nuevas */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <p className="text-xs font-semibold text-slate-700">Desarrollo de competencias genéricas</p>
                            <p className="text-[11px] text-slate-500">Selecciona, edita o agrega competencias genéricas. Se reflejan automáticamente como indicadores de alcance en la siguiente pestaña.</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium text-[11px]">
                              {comp.competencias_genericas.length} seleccionada{comp.competencias_genericas.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          {[
                            { key: 'Instrumentales', titulo: 'Competencias Instrumentales', catalogo: COMPETENCIAS_INSTRUMENTALES },
                            { key: 'Interpersonales', titulo: 'Competencias Interpersonales', catalogo: COMPETENCIAS_INTERPERSONALES },
                            { key: 'Sistémicas', titulo: 'Competencias Sistémicas', catalogo: COMPETENCIAS_SISTEMICAS },
                          ].map(({ key, titulo, catalogo }) => {
                            const personalizadasCat = genericasPersonalizadas[idx]?.[key] || []
                            // Detectar extras seleccionadas que no estén en ningún catálogo
                            const extrasSeleccionadas = comp.competencias_genericas.filter(
                              g => !catalogo.some(c => esMismaCompetencia(c, g))
                                && !COMPETENCIAS_INSTRUMENTALES.some(c => esMismaCompetencia(c, g))
                                && !COMPETENCIAS_INTERPERSONALES.some(c => esMismaCompetencia(c, g))
                                && !COMPETENCIAS_SISTEMICAS.some(c => esMismaCompetencia(c, g))
                                && !personalizadasCat.some(p => esMismaCompetencia(p, g))
                            )
                            // Combinar lista
                            const listaCombinada = Array.from(new Set([...catalogo, ...personalizadasCat, ...(key === 'Instrumentales' ? extrasSeleccionadas : [])]))

                            return (
                              <div key={key} className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex flex-col justify-between space-y-2">
                                <div>
                                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                                    <span className="font-bold text-slate-700">{titulo}</span>
                                    <span className="text-[10px] text-slate-400 font-semibold">
                                      {comp.competencias_genericas.filter(g => listaCombinada.some(c => esMismaCompetencia(c, g))).length} / {listaCombinada.length}
                                    </span>
                                  </div>

                                  <div className="space-y-1.5">
                                    {listaCombinada.map(nombre => {
                                      const checked = comp.competencias_genericas.some(g => esMismaCompetencia(g, nombre))
                                      const esPersonalizada = personalizadasCat.includes(nombre)
                                      const enEdicion = genericaEnEdicion?.unidadIdx === idx && genericaEnEdicion?.nombreOriginal === nombre

                                      if (enEdicion) {
                                        return (
                                          <div key={nombre} className="p-1.5 bg-white border border-brand-300 rounded-lg shadow-sm space-y-1.5">
                                            <input
                                              type="text"
                                              autoFocus
                                              value={genericaEnEdicion.nuevoNombre}
                                              onChange={e => setGenericaEnEdicion(prev => prev ? { ...prev, nuevoNombre: e.target.value } : null)}
                                              onKeyDown={e => {
                                                if (e.key === 'Enter') guardarEdicionCompetenciaGenerica(idx, nombre, genericaEnEdicion.nuevoNombre)
                                                if (e.key === 'Escape') setGenericaEnEdicion(null)
                                              }}
                                              className="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                            />
                                            <div className="flex items-center justify-end gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => setGenericaEnEdicion(null)}
                                                className="text-[10px] px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
                                              >
                                                Cancelar
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => guardarEdicionCompetenciaGenerica(idx, nombre, genericaEnEdicion.nuevoNombre)}
                                                className="text-[10px] px-2 py-0.5 rounded bg-brand-600 text-white font-medium hover:bg-brand-700"
                                              >
                                                Guardar
                                              </button>
                                            </div>
                                          </div>
                                        )
                                      }

                                      return (
                                        <div key={nombre} className="group flex items-start justify-between gap-1.5 hover:bg-white p-1 rounded-md transition-colors">
                                          <label className="flex items-start gap-1.5 text-slate-700 cursor-pointer flex-1 min-w-0">
                                            <input
                                              type="checkbox"
                                              className="mt-0.5 shrink-0 rounded text-emerald-600 focus:ring-emerald-500"
                                              checked={checked}
                                              onChange={() => toggleCompetenciaGenerica(idx, nombre)}
                                              disabled={soloLectura}
                                            />
                                            <span className={`text-[11px] leading-tight ${checked ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                                              {nombre}
                                            </span>
                                          </label>
                                          {!soloLectura && (
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                                              <button
                                                type="button"
                                                onClick={() => setGenericaEnEdicion({ unidadIdx: idx, nombreOriginal: nombre, nuevoNombre: nombre })}
                                                title="Editar redacción"
                                                className="text-slate-400 hover:text-brand-600 p-0.5"
                                              >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                              </button>
                                              {esPersonalizada && (
                                                <button
                                                  type="button"
                                                  onClick={() => quitarCompetenciaGenericaPersonalizada(idx, key, nombre)}
                                                  title="Eliminar competencia personalizada"
                                                  className="text-slate-400 hover:text-red-600 p-0.5"
                                                >
                                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                  </svg>
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* Formulario para agregar nueva competencia genérica */}
                                {!soloLectura && (
                                  <div className="pt-2 border-t border-slate-200">
                                    {nuevaGenericaInput?.unidadIdx === idx && nuevaGenericaInput?.categoria === key ? (
                                      <div className="space-y-1.5 p-1.5 bg-white border border-emerald-300 rounded-lg shadow-sm">
                                        <input
                                          type="text"
                                          autoFocus
                                          placeholder="Nombre de la competencia..."
                                          value={nuevaGenericaInput.texto}
                                          onChange={e => setNuevaGenericaInput(prev => prev ? { ...prev, texto: e.target.value } : null)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') agregarCompetenciaGenericaPersonalizada(idx, key, nuevaGenericaInput.texto)
                                            if (e.key === 'Escape') setNuevaGenericaInput(null)
                                          }}
                                          className="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => setNuevaGenericaInput(null)}
                                            className="text-[10px] px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => agregarCompetenciaGenericaPersonalizada(idx, key, nuevaGenericaInput.texto)}
                                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                                          >
                                            + Agregar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setNuevaGenericaInput({ unidadIdx: idx, categoria: key, texto: '' })}
                                        className="w-full py-1 px-2 text-left text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors flex items-center gap-1"
                                      >
                                        <span>+</span> Agregar competencia
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                  })()}

                  {vc.cat === 'indicadores' && (
                    <div className="space-y-4" data-tablas-sin-borde>
                      {/* Alerta de cambios pendientes si las evidencias o competencias genéricas se modificaron */}
                      {hayCambiosPendientesSincronizacion(comp) && !soloLectura && (
                        <div className="flex items-center justify-between gap-3 text-xs bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-3 shadow-sm">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg shrink-0">🔔</span>
                            <div>
                              <p className="font-semibold text-amber-900">Se detectaron modificaciones en las actividades o competencias genéricas</p>
                              <p className="text-[11px] text-amber-700">Las evidencias de aprendizaje o indicadores cambiaron. Haz clic en actualizar para sincronizar la matriz y los niveles de desempeño.</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => actualizarIndicadoresYNivelesUnidad(idx, true)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold shrink-0 shadow-sm transition-colors flex items-center gap-1.5"
                          >
                            <span>🔄</span> Actualizar ahora
                          </button>
                        </div>
                      )}

                      {/* Lo que se guarda (autoguardado) no es lo mismo que "completo": esta
                          categoría solo marca ✓ en la cuadrícula cuando se cumplen ambos
                          requisitos — se muestra explícito para que no parezca que no se
                          guardó lo ya capturado. */}
                      <div className="flex flex-wrap gap-3 text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                        <span className={`flex items-center gap-1 ${comp.indicadores_alcance.length > 0 ? 'text-green-700' : 'text-slate-400'}`}>
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${comp.indicadores_alcance.length > 0 ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                            {comp.indicadores_alcance.length > 0 ? '✓' : ''}
                          </span>
                          Al menos 1 indicador de alcance
                        </span>
                        <span className={`flex items-center gap-1 ${comp.matriz_evaluacion.length >= MIN_EVIDENCIAS_POR_UNIDAD ? 'text-green-700' : 'text-slate-400'}`}>
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${comp.matriz_evaluacion.length >= MIN_EVIDENCIAS_POR_UNIDAD ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                            {comp.matriz_evaluacion.length >= MIN_EVIDENCIAS_POR_UNIDAD ? '✓' : ''}
                          </span>
                          Al menos {MIN_EVIDENCIAS_POR_UNIDAD} evidencias de aprendizaje ({comp.matriz_evaluacion.length} de {MIN_EVIDENCIAS_POR_UNIDAD})
                        </span>
                        <span className="text-slate-400">— ambos deben cumplirse para que esta categoría quede marcada como completa.</span>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                            <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
                            Indicadores de alcance y niveles de desempeño
                          </p>
                          {!soloLectura && (
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => actualizarIndicadoresYNivelesUnidad(idx, true)}
                                title="Sincroniza los indicadores de alcance, las evidencias y actualiza la redacción de los 5 niveles de desempeño con las evidencias actuales"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1 rounded-md transition-colors"
                              >
                                <span>🔄</span> Actualizar niveles e indicadores
                              </button>
                              <button type="button" onClick={() => agregarIndicador(idx)} className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline">+ Agregar indicador</button>
                            </div>
                          )}
                        </div>

                        {/* Pantallas pequeñas: dos bloques apilados — la matriz completa de 7
                            columnas no cabe sin cortarse. */}
                        <div className="sm:hidden space-y-4">
                          <div className="space-y-1.5">
                            {comp.indicadores_alcance.map((ind, indIdx) => (
                              <div key={indIdx} className="border border-slate-100 border-l-4 border-l-amber-300 rounded-lg p-2.5 space-y-1.5 bg-white">
                                <div className="flex items-center gap-2">
                                  <input value={ind.letra} onChange={e => setIndicador(idx, indIdx, { letra: e.target.value })} placeholder="A" className={smallInputCls + ' !w-14 shrink-0 text-center'} disabled={soloLectura} />
                                  <input type="number" min="0" value={ind.valor ?? ''} onChange={e => setIndicador(idx, indIdx, { valor: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Valor %" className={smallInputCls + ' !w-24 shrink-0'} disabled={soloLectura} />
                                  {!soloLectura && (
                                    <button type="button" onClick={() => quitarIndicador(idx, indIdx)} className="text-xs text-red-600 hover:underline shrink-0 ml-auto">Quitar</button>
                                  )}
                                </div>
                                <input value={ind.indicador} onChange={e => setIndicador(idx, indIdx, { indicador: e.target.value })} placeholder="Indicador de alcance" className={smallInputCls} disabled={soloLectura} />
                              </div>
                            ))}
                            <div className={`flex items-center justify-between text-[11px] px-1 ${comp.indicadores_alcance.reduce((acc, i) => acc + (i.valor ?? 0), 0) === (comp.porcentaje ?? 0) ? 'text-green-700' : 'text-amber-600'}`}>
                              <span className="font-medium">Suma de indicadores de alcance</span>
                              <span className="font-semibold">{comp.indicadores_alcance.reduce((acc, i) => acc + (i.valor ?? 0), 0)}% de {comp.porcentaje ?? 0}%</span>
                            </div>
                          </div>
                          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm shadow-slate-200/50">
                            <table className="w-full text-xs">
                              <thead className="bg-gradient-to-r from-slate-100 to-sky-50/70">
                                <tr>
                                  <th className="px-2 py-1.5 text-left font-medium text-slate-500">Nivel</th>
                                  <th className="px-2 py-1.5 text-left font-medium text-slate-500 w-16">Rango</th>
                                  <th className="px-2 py-1.5 text-left font-medium text-slate-500">Indicadores</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {comp.niveles_desempeno.map((n, nivelIdx) => (
                                  <tr key={n.nivel}>
                                    <td className="px-2 py-1 font-medium text-slate-700 whitespace-nowrap">{n.nivel}</td>
                                    <td className="px-2 py-1 text-slate-400 whitespace-nowrap">{NIVEL_RANGO[n.nivel]}</td>
                                    <td className="px-2 py-1">
                                      <input value={n.indicadores} onChange={e => setNivelDesempeno(idx, nivelIdx, e.target.value)} className={smallInputCls} disabled={soloLectura} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* sm en adelante: matriz unificada, igual al formato oficial —
                            indicadores de alcance (izquierda) y niveles de desempeño
                            (derecha, con la columna "Desempeño" agrupando por rowspan). */}
                        <div className="hidden sm:block border border-slate-200 rounded-lg overflow-hidden shadow-sm shadow-slate-200/50 overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead className="bg-gradient-to-r from-amber-50/70 via-slate-100 to-sky-50/70">
                              <tr>
                                <th className="px-2 py-1.5 text-left font-medium text-slate-500 w-10">Letra</th>
                                <th className="px-2 py-1.5 text-left font-medium text-slate-500">Indicadores de alcance</th>
                                <th className="px-2 py-1.5 text-center font-medium text-slate-500 border-l border-slate-200 w-20">Valor % indicador</th>
                                <th className="px-2 py-1.5 text-center font-medium text-slate-500 border-l border-slate-200 w-28">Desempeño</th>
                                <th className="px-2 py-1.5 text-left font-medium text-slate-500 border-l border-slate-200 w-24">Nivel de desempeño</th>
                                <th className="px-2 py-1.5 text-left font-medium text-slate-500 border-l border-slate-200">Indicadores de alcance</th>
                                <th className="px-2 py-1.5 text-center font-medium text-slate-500 border-l border-slate-200 w-20">Valoración numérica</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {Array.from({ length: Math.max(comp.indicadores_alcance.length, comp.niveles_desempeno.length) }).map((_, rowIdx) => {
                                const ind = comp.indicadores_alcance[rowIdx]
                                const nivel = comp.niveles_desempeno[rowIdx]
                                // La columna "Desempeño" agrupa (rowspan) los 4 niveles superiores bajo
                                // "Competencia alcanzada" y el último bajo "Competencia no alcanzada" —
                                // mismo criterio institucional que el PDF oficial.
                                const esInicioGrupoAlcanzada = nivel?.nivel === 'Excelente'
                                const esInicioGrupoNoAlcanzada = nivel?.nivel === 'Insuficiente'
                                return (
                                  <tr key={rowIdx} className="align-top hover:bg-amber-50/20 transition-colors">
                                    <td className="px-2 py-1.5">
                                      {ind ? (
                                        <input value={ind.letra} onChange={e => setIndicador(idx, rowIdx, { letra: e.target.value })} placeholder="A" className={smallInputCls + ' !w-12 text-center'} disabled={soloLectura} />
                                      ) : null}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      {ind ? (
                                        <>
                                          <div className="flex items-center gap-1.5">
                                            <input value={ind.indicador} onChange={e => setIndicador(idx, rowIdx, { indicador: e.target.value })} placeholder="Indicador de alcance" className={smallInputCls + ' flex-1'} disabled={soloLectura} />
                                            {!soloLectura && (
                                              <button type="button" onClick={() => quitarIndicador(idx, rowIdx)} title="Quitar indicador" className="text-red-500 hover:text-red-700 shrink-0">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                              </button>
                                            )}
                                          </div>
                                          {!soloLectura && (
                                            <MejorarConIa texto={ind.indicador} tipo="indicador" onAplicar={t => setIndicador(idx, rowIdx, { indicador: t })} />
                                          )}
                                        </>
                                      ) : null}
                                    </td>
                                    <td className="px-2 py-1.5 border-l border-slate-100 text-center">
                                      {ind ? (
                                        <input type="number" min="0" value={ind.valor ?? ''} onChange={e => setIndicador(idx, rowIdx, { valor: e.target.value === '' ? null : Number(e.target.value) })} placeholder="%" className={smallInputCls + ' text-center'} disabled={soloLectura} />
                                      ) : null}
                                    </td>
                                    {esInicioGrupoAlcanzada && (
                                      <td className="px-2 py-1.5 border-l border-slate-100 text-center font-medium text-slate-600 bg-slate-50/50" rowSpan={4}>
                                        Competencia<br />alcanzada
                                      </td>
                                    )}
                                    {esInicioGrupoNoAlcanzada && (
                                      <td className="px-2 py-1.5 border-l border-slate-100 text-center font-medium text-slate-600 bg-slate-50/50" rowSpan={1}>
                                        Competencia<br />no alcanzada
                                      </td>
                                    )}
                                    <td className="px-2 py-1.5 border-l border-slate-100 font-medium text-slate-700 whitespace-nowrap">
                                      {nivel?.nivel ?? ''}
                                    </td>
                                    <td className="px-2 py-1.5 border-l border-slate-100">
                                      {nivel ? (
                                        <input value={nivel.indicadores} onChange={e => setNivelDesempeno(idx, rowIdx, e.target.value)} className={smallInputCls} disabled={soloLectura} />
                                      ) : null}
                                    </td>
                                    <td className="px-2 py-1.5 border-l border-slate-100 text-center text-slate-400 whitespace-nowrap">
                                      {nivel ? NIVEL_RANGO[nivel.nivel] : ''}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-50">
                                <td className="px-2 py-1.5 text-slate-500 font-medium" colSpan={2}>Suma de indicadores de alcance</td>
                                <td className={`px-2 py-1.5 border-l border-slate-100 text-center font-semibold ${comp.indicadores_alcance.reduce((acc, i) => acc + (i.valor ?? 0), 0) === (comp.porcentaje ?? 0) ? 'text-green-700' : 'text-amber-600'}`}>
                                  {comp.indicadores_alcance.reduce((acc, i) => acc + (i.valor ?? 0), 0)}%
                                </td>
                                <td className="px-2 py-1.5 border-l border-slate-100 text-[11px] text-slate-400" colSpan={4}>
                                  {comp.porcentaje ?? 0}% aportación de la unidad a la materia
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                            <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" />
                            Evidencias de aprendizaje y evaluación formativa
                          </p>
                          {!soloLectura && (
                            <button type="button" onClick={() => agregarFilaMatriz(idx)} className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline">+ Agregar evidencia</button>
                          )}
                        </div>

                        {(() => {
                          const limiteEvid = limiteEvidencia(comp.porcentaje)
                          const sumaEvidencias = comp.matriz_evaluacion.reduce((acc, f) => acc + (f.porcentaje ?? 0), 0)
                          const letras = comp.indicadores_alcance.filter(ind => ind.letra).map(ind => ind.letra)
                          return (
                            <>
                              {comp.matriz_evaluacion.length > 0 && comp.matriz_evaluacion.length < MIN_EVIDENCIAS_POR_UNIDAD && (
                                <p className="text-[11px] text-amber-600 mb-1.5">
                                  Se requieren al menos {MIN_EVIDENCIAS_POR_UNIDAD} evidencias de aprendizaje por unidad.
                                </p>
                              )}
                              {comp.matriz_evaluacion.length === 0 ? (
                                <p className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg px-3 py-4 text-center">
                                  Sin evidencias registradas.
                                </p>
                              ) : (
                                <>
                                {/* Pantallas pequeñas: tarjetas apiladas — la matriz completa no cabe sin
                                    forzar celdas angostas y encabezados partidos en varias líneas. */}
                                <div className="sm:hidden space-y-2">
                                  {comp.matriz_evaluacion.map((fila, filaIdx) => {
                                    const excedeLimite = fila.porcentaje != null && fila.porcentaje > limiteEvid
                                    return (
                                      <div key={filaIdx} className="border border-slate-100 border-l-4 border-l-emerald-300 rounded-lg p-3 space-y-2.5 bg-white">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Evidencia {filaIdx + 1}</span>
                                          {!soloLectura && (
                                            <button type="button" onClick={() => quitarFilaMatriz(idx, filaIdx)} className="text-xs text-red-600 hover:underline shrink-0">Quitar</button>
                                          )}
                                        </div>
                                        <div className="flex items-start gap-2">
                                          <div className="flex-1 min-w-0">
                                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Evidencia de aprendizaje</label>
                                            <input value={fila.evidencia} onChange={e => setFilaMatriz(idx, filaIdx, { evidencia: e.target.value })} placeholder="Ej. Mapa conceptual" className={smallInputCls} disabled={soloLectura} />
                                          </div>
                                          <div className="w-16 shrink-0">
                                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">%</label>
                                            <input type="number" value={fila.porcentaje ?? ''} readOnly title="Se calcula automáticamente al marcar los indicadores de alcance de esta evidencia" className={smallInputCls + ' !bg-slate-100 cursor-default' + (excedeLimite ? ' !border-red-400' : '')} disabled={soloLectura} />
                                          </div>
                                        </div>
                                        {excedeLimite && (
                                          <p className="text-[11px] text-red-600">Máximo {limiteEvid}% (40% del {comp.porcentaje ?? 0}% de la unidad).</p>
                                        )}
                                        {!!letras.length && (
                                          <div>
                                            <label className="block text-[10px] font-medium text-slate-500 mb-1">Indicadores que cubre</label>
                                            <div className="flex flex-wrap gap-1.5">
                                              {letras.map(letra => {
                                                const activo = fila.indicadores.includes(letra)
                                                return (
                                                  <button
                                                    key={letra}
                                                    type="button"
                                                    onClick={() => toggleIndicadorEnFila(idx, filaIdx, letra)}
                                                    disabled={soloLectura}
                                                    aria-pressed={activo}
                                                    className={`w-6 h-6 rounded-full text-[11px] font-semibold border transition-colors ${
                                                      activo
                                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                                    }`}
                                                  >
                                                    {letra}
                                                  </button>
                                                )
                                              })}
                                            </div>
                                          </div>
                                        )}
                                        <div>
                                          <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Evaluación formativa de la competencia</label>
                                          <SelectorInstrumentoEvaluacion
                                            valor={fila.evaluacion_formativa}
                                            evidencia={fila.evidencia}
                                            contexto={`${cargaActual?.materia?.nombre ?? ''} - ${comp.descripcion ?? ''}`}
                                            disabled={soloLectura}
                                            smallInputCls={smallInputCls}
                                            onChange={t => setFilaMatriz(idx, filaIdx, { evaluacion_formativa: t })}
                                            onAbrirModalDiseno={() => abrirModalDisenoParaFila(idx, filaIdx, fila)}
                                          />
                                        </div>
                                      </div>
                                    )
                                  })}
                                  <div className={`flex items-center justify-between text-[11px] px-1 ${sumaEvidencias === (comp.porcentaje ?? 0) ? 'text-green-700' : 'text-amber-600'}`}>
                                    <span className="font-medium">Suma de evidencias</span>
                                    <span className="font-semibold">{sumaEvidencias}% de {comp.porcentaje ?? 0}%</span>
                                  </div>
                                </div>

                                {/* sm en adelante: matriz completa en tabla */}
                                <div className="hidden sm:block border border-slate-200 rounded-lg overflow-hidden shadow-sm shadow-slate-200/50 overflow-x-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <thead className="bg-gradient-to-r from-slate-100 to-emerald-50/70">
                                      <tr>
                                        <th className="px-2 py-1.5 text-left font-medium text-slate-500 border-b border-slate-200" rowSpan={2}>Evidencias de aprendizaje</th>
                                        <th className="px-2 py-1.5 text-center font-medium text-slate-500 border-b border-l border-slate-200 w-16" rowSpan={2}>%</th>
                                        {!!letras.length && (
                                          <th className="px-2 py-1 text-center font-medium text-slate-500 border-b border-l border-slate-200" colSpan={letras.length}>Indicadores de alcance</th>
                                        )}
                                        <th className="px-2 py-1.5 text-left font-medium text-slate-500 border-b border-l border-slate-200" rowSpan={2}>Evaluación formativa de la competencia</th>
                                        <th className="border-b border-slate-200 w-10" rowSpan={2}></th>
                                      </tr>
                                      {!!letras.length && (
                                        <tr>
                                          {letras.map(letra => (
                                            <th key={letra} className="px-1.5 py-1 text-center font-medium text-slate-500 border-b border-l border-slate-200 w-8">{letra}</th>
                                          ))}
                                        </tr>
                                      )}
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {comp.matriz_evaluacion.map((fila, filaIdx) => {
                                        const excedeLimite = fila.porcentaje != null && fila.porcentaje > limiteEvid
                                        return (
                                          <tr key={filaIdx} className="align-top hover:bg-emerald-50/30 transition-colors">
                                            <td className="px-2 py-1.5 min-w-[200px]">
                                              <input value={fila.evidencia} onChange={e => setFilaMatriz(idx, filaIdx, { evidencia: e.target.value })} placeholder="Ej. Mapa conceptual" className={smallInputCls} disabled={soloLectura} />
                                              {!soloLectura && (
                                                <MejorarConIa texto={fila.evidencia} tipo="evidencia" onAplicar={t => setFilaMatriz(idx, filaIdx, { evidencia: t })} />
                                              )}
                                            </td>
                                            <td className="px-2 py-1.5 border-l border-slate-100">
                                              <input type="number" value={fila.porcentaje ?? ''} readOnly title="Se calcula automáticamente al marcar los indicadores de alcance de esta evidencia" className={smallInputCls + ' !w-16 text-center !bg-slate-100 cursor-default' + (excedeLimite ? ' !border-red-400' : '')} disabled={soloLectura} />
                                              {excedeLimite && (
                                                <p className="text-[10px] text-red-600 mt-0.5 whitespace-nowrap">Máx. {limiteEvid}%</p>
                                              )}
                                            </td>
                                            {letras.map(letra => {
                                              const activo = fila.indicadores.includes(letra)
                                              return (
                                                <td key={letra} className="px-1 py-1.5 border-l border-slate-100 text-center">
                                                  <input
                                                    type="checkbox"
                                                    checked={activo}
                                                    onChange={() => toggleIndicadorEnFila(idx, filaIdx, letra)}
                                                    disabled={soloLectura}
                                                    className="align-middle"
                                                  />
                                                </td>
                                              )
                                            })}
                                            <td className="px-2 py-1.5 border-l border-slate-100 min-w-[280px]">
                                              <SelectorInstrumentoEvaluacion
                                                valor={fila.evaluacion_formativa}
                                                evidencia={fila.evidencia}
                                                contexto={`${cargaActual?.materia?.nombre ?? ''} - ${comp.descripcion ?? ''}`}
                                                disabled={soloLectura}
                                                smallInputCls={smallInputCls}
                                                onChange={t => setFilaMatriz(idx, filaIdx, { evaluacion_formativa: t })}
                                                onAbrirModalDiseno={() => abrirModalDisenoParaFila(idx, filaIdx, fila)}
                                              />
                                            </td>
                                            <td className="px-1 py-1.5 border-l border-slate-100 text-center">
                                              {!soloLectura && (
                                                <button type="button" onClick={() => quitarFilaMatriz(idx, filaIdx)} title="Quitar evidencia" className="text-red-500 hover:text-red-700">
                                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                  </svg>
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr className="bg-slate-50">
                                        <td className="px-2 py-1.5 text-slate-500 font-medium">Suma de evidencias de aprendizaje</td>
                                        <td className={`px-2 py-1.5 border-l border-slate-100 text-center font-semibold whitespace-nowrap ${sumaEvidencias === (comp.porcentaje ?? 0) ? 'text-green-700' : 'text-amber-600'}`}>
                                          {sumaEvidencias}%
                                        </td>
                                        <td className="px-2 py-1.5 border-l border-slate-100 text-[11px] text-slate-400" colSpan={letras.length + 2}>
                                          de {comp.porcentaje ?? 0}% asignado a la unidad
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                                </>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )}

                  {vc.cat === 'fuentes' && (
                    <div>
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                        <p className="text-xs font-bold text-slate-700">Fuentes de información</p>
                        {!soloLectura && (
                          <div className="flex items-center gap-2">
                            {todasLasFuentesCatalog.length > 0 && (
                              <button
                                type="button"
                                onClick={() => abrirModalFuente(idx, null, 'reutilizar')}
                                className="text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold transition-all hover:bg-indigo-100 shadow-sm"
                                title="Reutilizar fuentes registradas en otros temas de la asignatura"
                              >
                                <span>📚</span>
                                <span>Reutilizar de asignatura ({todasLasFuentesCatalog.length})</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => abrirModalFuente(idx, null, 'individual')}
                              className="text-xs text-brand-700 hover:text-brand-900 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold transition-all hover:bg-brand-100 shadow-sm"
                            >
                              <span>+</span>
                              <span>Nueva fuente</span>
                            </button>
                          </div>
                        )}
                      </div>
                      {comp.fuentes_informacion.length === 0 && (
                        <p className="text-xs text-slate-400">Sin fuentes de información registradas.</p>
                      )}
                      <div className="space-y-1.5">
                        {comp.fuentes_informacion.map((f, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-2 border border-slate-100 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              {f.tipo && (
                                <span className="inline-block text-[10px] font-medium text-brand-700 bg-brand-50 rounded-full px-2 py-0.5 mb-1">
                                  {TIPO_FUENTE_LABEL[f.tipo]}
                                </span>
                              )}
                              <p className="text-xs text-slate-700">{citarFuente(f)}</p>
                            </div>
                            {!soloLectura && (
                              <div className="flex items-center gap-2 shrink-0">
                                <button type="button" onClick={() => abrirModalFuente(idx, fIdx)} className="text-xs text-brand-600 hover:underline">Editar</button>
                                <button type="button" onClick={() => quitarFuente(idx, fIdx)} className="text-xs text-red-600 hover:underline">Quitar</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {vc.cat === 'apoyo' && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-2">Apoyo didáctico</p>
                      <p className="text-xs text-slate-400 mb-2">Selecciona los que aplican; si el que necesitas no aparece, agrégalo abajo.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
                        {[...new Set([...APOYOS_DIDACTICOS_CATALOGO, ...comp.apoyos_didacticos])].map(nombre => (
                          <label key={nombre} className="flex items-center gap-2 text-xs text-slate-600">
                            <input type="checkbox" checked={comp.apoyos_didacticos.includes(nombre)}
                              onChange={() => toggleApoyo(idx, nombre)} disabled={soloLectura} />
                            <span>{nombre}</span>
                          </label>
                        ))}
                      </div>
                      {!soloLectura && (
                        <div className="flex items-center gap-1.5">
                          <input
                            value={nuevoApoyo[idx] ?? ''}
                            onChange={e => setNuevoApoyo(prev => ({ ...prev, [idx]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                agregarApoyoPersonalizado(idx, nuevoApoyo[idx] ?? '')
                                setNuevoApoyo(prev => ({ ...prev, [idx]: '' }))
                              }
                            }}
                            placeholder="Agregar apoyo didáctico personalizado…"
                            className={smallInputCls + ' flex-1'}
                          />
                          <button type="button"
                            onClick={() => { agregarApoyoPersonalizado(idx, nuevoApoyo[idx] ?? ''); setNuevoApoyo(prev => ({ ...prev, [idx]: '' })) }}
                            className="text-xs text-brand-600 hover:underline shrink-0">+ Agregar</button>
                        </div>
                      )}
                      {planeacionActual && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-[10px] font-medium text-slate-500 mb-1.5">Material adjunto de esta unidad</p>
                          <ArchivosAdjuntos planeacionId={planeacionActual.id} unidad={comp.numero} />
                        </div>
                      )}
                    </div>
                  )}

                  {vc.cat === 'practicas' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-slate-600">Prácticas</p>
                        {!soloLectura && (
                          <button type="button" onClick={() => agregarPractica(idx)}
                            className="text-xs font-medium text-brand-600 bg-brand-50 border border-brand-100 rounded-lg px-2.5 py-1 hover:bg-brand-100 transition-colors">
                            + Agregar práctica
                          </button>
                        )}
                      </div>

                      {comp.practicas.length === 0 && (
                        <p className="text-xs text-slate-400">Sin prácticas registradas.</p>
                      )}

                      <div className="space-y-4">
                        {comp.practicas.map((p, pIdx) => {
                          const esAula = aulas.some(a => a.nombre === p.lugar)
                          const clavePractica = `${idx}-${pIdx}`
                          const esOtro = lugarOtroActivo[clavePractica] ?? (!!p.lugar && !esAula)
                          const claveRequisito = clavePractica
                          return (
                            <div key={pIdx} className="border border-slate-200 rounded-xl shadow-sm shadow-slate-200/50 hover:shadow-md transition-all overflow-hidden">
                              <div className="flex items-center gap-2.5 bg-slate-50 border-b border-slate-100 px-4 py-2.5">
                                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] font-semibold flex items-center justify-center shadow-sm">{pIdx + 1}</span>
                                <input value={p.nombre} onChange={e => setPractica(idx, pIdx, { nombre: e.target.value })}
                                  placeholder="Nombre de la práctica"
                                  title={p.nombre || undefined}
                                  className="flex-1 min-w-0 text-sm font-medium text-slate-700 border-0 focus:outline-none bg-transparent placeholder:font-normal placeholder:text-slate-400 truncate"
                                  disabled={soloLectura} />
                                {!soloLectura && (
                                  <button type="button" onClick={() => quitarPractica(idx, pIdx)} title="Quitar práctica"
                                    className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>

                              <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-5">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Competencia</p>
                                    {!soloLectura && p.competencia_especifica !== comp.descripcion && (
                                      <button type="button" onClick={() => setPractica(idx, pIdx, { competencia_especifica: comp.descripcion })}
                                        className="text-[11px] text-brand-600 hover:underline">Usar la del tema</button>
                                    )}
                                  </div>
                                  <RichTextField value={p.competencia_especifica}
                                    onChange={html => setPractica(idx, pIdx, { competencia_especifica: html })}
                                    placeholder="Por defecto usa la competencia específica del tema; edítala si esta práctica apunta a otra cosa."
                                    minHeight={90} disabled={soloLectura} />
                                </div>

                                <div className="md:col-span-4 bg-slate-50 border border-slate-100 rounded-lg p-3">
                                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Requisitos</p>
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {[...new Set([...REQUISITOS_PRACTICA_CATALOGO, ...p.requisitos])].map(nombre => {
                                      const activo = p.requisitos.includes(nombre)
                                      return (
                                        <button key={nombre} type="button" disabled={soloLectura}
                                          onClick={() => toggleRequisitoPractica(idx, pIdx, nombre)}
                                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                            activo ? 'bg-brand-50 text-brand-700 border-brand-200 font-medium' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                          }`}>
                                          {nombre}
                                        </button>
                                      )
                                    })}
                                  </div>
                                  {!soloLectura && (
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        value={nuevoRequisito[claveRequisito] ?? ''}
                                        onChange={e => setNuevoRequisito(prev => ({ ...prev, [claveRequisito]: e.target.value }))}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault()
                                            agregarRequisitoPersonalizado(idx, pIdx, nuevoRequisito[claveRequisito] ?? '')
                                            setNuevoRequisito(prev => ({ ...prev, [claveRequisito]: '' }))
                                          }
                                        }}
                                        placeholder="Agregar otro requisito…"
                                        className={smallInputCls + ' flex-1 bg-white'}
                                      />
                                      <button type="button"
                                        onClick={() => { agregarRequisitoPersonalizado(idx, pIdx, nuevoRequisito[claveRequisito] ?? ''); setNuevoRequisito(prev => ({ ...prev, [claveRequisito]: '' })) }}
                                        className="text-xs text-brand-600 hover:underline shrink-0">+ Agregar</button>
                                    </div>
                                  )}
                                </div>

                                <div className="md:col-span-3 space-y-4">
                                  <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Semana</p>
                                    <select
                                      value={p.semana ?? ''}
                                      onChange={e => setPractica(idx, pIdx, { semana: e.target.value === '' ? null : Number(e.target.value) })}
                                      className={smallInputCls} disabled={soloLectura}
                                    >
                                      <option value="">— Selecciona —</option>
                                      {Array.from({ length: TOTAL_SEMANAS }, (_, i) => i + 1).map(s => {
                                        const rango = rangoFechasSemana(periodoActual?.fecha_inicio, s)
                                        return <option key={s} value={s}>Sem {s}{rango ? ` (${rango})` : ''}</option>
                                      })}
                                    </select>
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Lugar y hora</p>
                                    <select
                                      value={esOtro ? '__otro__' : p.lugar}
                                      onChange={e => {
                                        const esOtroSel = e.target.value === '__otro__'
                                        setLugarOtroActivo(prev => ({ ...prev, [clavePractica]: esOtroSel }))
                                        setPractica(idx, pIdx, { lugar: esOtroSel ? '' : e.target.value })
                                      }}
                                      className={smallInputCls} disabled={soloLectura}
                                    >
                                      <option value="">— Selecciona —</option>
                                      {aulas.map(a => <option key={a.id} value={a.nombre}>{a.nombre}</option>)}
                                      <option value="__otro__">Otro lugar (fuera del instituto)</option>
                                    </select>
                                    {esOtro && (
                                      <input value={p.lugar} onChange={e => setPractica(idx, pIdx, { lugar: e.target.value })}
                                        placeholder="Especifica el lugar" className={smallInputCls + ' mt-1.5'} disabled={soloLectura} autoFocus />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            // ── Vista principal: temas × secciones ──────────────────────────
            const sumaPorcentajes = form.competencias.reduce((acc, c) => acc + (c.porcentaje ?? 0), 0)
            const totalSecciones = form.competencias.length * CATEGORIAS.length
            const seccionesCompletas = form.competencias.reduce(
              (acc, c) => acc + CATEGORIAS.filter(cat => categoriaCompleta(c, cat.id)).length, 0)
            // Primera sección sin terminar (en orden de tema y de sección): el botón
            // "Continuar" lleva directo ahí, sin tener que buscar la palomita que falta.
            const siguientePendiente = (() => {
              for (let i = 0; i < form.competencias.length; i++) {
                const cat = CATEGORIAS.find(ct => !categoriaCompleta(form.competencias[i], ct.id))
                if (cat) return { idx: i, cat: cat.id }
              }
              return null
            })()
            const pctAvance = totalSecciones ? Math.round((seccionesCompletas / totalSecciones) * 100) : 0
            const sumaOk = sumaPorcentajes === 100

            return (
              <div className="pt-0">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">4. Análisis por competencias específicas</label>
                  {!soloLectura && (
                    <button type="button" onClick={agregarCompetencia}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      Agregar tema
                    </button>
                  )}
                </div>

                {form.competencias.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
                    <p className="text-sm text-slate-600">Aún no hay temas registrados.</p>
                    <p className="text-xs text-slate-400 mt-1">Agrega un tema por cada competencia específica de la asignatura.</p>
                  </div>
                ) : (
                  /* Resumen: avance general, suma de % y atajo a lo pendiente */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">Avance de secciones</span>
                        <span className="font-semibold text-slate-800 tabular-nums">{seccionesCompletas}/{totalSecciones}</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pctAvance === 100 ? 'bg-emerald-500' : 'bg-brand-600'}`} style={{ width: `${pctAvance}%` }} />
                      </div>
                    </div>
                    <div className={`rounded-xl border p-3 ${sumaOk ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50/60'}`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">Suma de % por tema</span>
                        <span className={`font-semibold tabular-nums ${sumaOk ? 'text-emerald-700' : 'text-amber-700'}`}>{sumaPorcentajes}% de 100%</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${sumaOk ? 'bg-emerald-500' : sumaPorcentajes > 100 ? 'bg-red-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(100, sumaPorcentajes)}%` }} />
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
                      {siguientePendiente ? (
                        <>
                          <div className="min-w-0 text-xs">
                            <p className="font-medium text-slate-600">Siguiente pendiente</p>
                            <p className="text-slate-500 truncate">
                              Tema {form.competencias[siguientePendiente.idx].numero} · {CATEGORIAS.find(c => c.id === siguientePendiente.cat)?.label}
                            </p>
                          </div>
                          <button type="button" onClick={() => setVistaCompetencia(siguientePendiente)}
                            className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-white bg-brand-600 rounded-lg px-3 py-1.5 hover:bg-brand-700 transition-colors">
                            Continuar <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </>
                      ) : (
                        <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Todas las secciones están completas
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  {form.competencias.map((c, idx) => {
                    const incompleta = !c.nombre_unidad.trim() || c.porcentaje == null
                    const completas = CATEGORIAS.filter(cat => categoriaCompleta(c, cat.id)).length
                    const todo = completas === CATEGORIAS.length
                    return (
                    <div key={idx} className={`rounded-xl border bg-white transition-shadow hover:shadow-sm ${
                      incompleta ? 'border-amber-200' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3 px-4 pt-3">
                        <span className={`shrink-0 w-7 h-7 rounded-full text-white text-xs font-semibold flex items-center justify-center ${todo ? 'bg-emerald-600' : 'bg-brand-600'}`}>
                          {todo ? <Check className="w-3.5 h-3.5" strokeWidth={3} aria-label="Tema completo" /> : c.numero}
                        </span>
                        <div className="flex-1 min-w-0">
                          <input value={c.nombre_unidad} onChange={e => setCompetencia(idx, { nombre_unidad: e.target.value })}
                            placeholder="Nombre del tema (obligatorio)"
                            aria-label={`Nombre del tema ${c.numero}`}
                            className="w-full text-sm font-semibold text-slate-800 border-0 border-b border-transparent hover:border-slate-300 focus:border-brand-600 focus:outline-none px-0 py-0.5 bg-transparent disabled:bg-transparent placeholder:font-normal placeholder:italic placeholder:text-amber-600"
                            disabled={soloLectura} />
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-1 w-24 rounded-full bg-slate-100 overflow-hidden">
                              <div className={`h-full rounded-full ${todo ? 'bg-emerald-500' : 'bg-brand-600'}`} style={{ width: `${(completas / CATEGORIAS.length) * 100}%` }} />
                            </div>
                            <span className="text-[11px] text-slate-500 tabular-nums">{completas} de {CATEGORIAS.length} secciones</span>
                          </div>
                        </div>
                        <label className={`flex items-center gap-1 shrink-0 rounded-lg border px-2 py-1 ${
                          c.porcentaje == null ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
                        }`} title="Aportación del tema a la calificación final">
                          <input type="number" min="0" max="100" value={c.porcentaje ?? ''}
                            onChange={e => setCompetencia(idx, { porcentaje: e.target.value === '' ? null : Number(e.target.value) })}
                            placeholder="—" aria-label={`Porcentaje del tema ${c.numero}`}
                            className="w-10 text-right text-sm font-medium bg-transparent focus:outline-none" disabled={soloLectura} />
                          <span className="text-xs text-slate-400">%</span>
                        </label>
                        {!soloLectura && (
                          <button type="button"
                            onClick={() => {
                              const nombre = c.nombre_unidad.trim() ? `"${c.nombre_unidad.trim()}"` : `el tema ${c.numero}`
                              if (window.confirm(`¿Quitar ${nombre}? Se perderá todo lo capturado en sus secciones.`)) quitarCompetencia(idx)
                            }}
                            title="Quitar tema" aria-label={`Quitar tema ${c.numero}`}
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      <div className="px-4 pb-3 pt-2.5">
                        {incompleta && (
                          <p className="text-[11px] text-amber-700 mb-2">Falta el nombre y/o el % de aportación del tema.</p>
                        )}
                        {c.porcentaje != null && c.porcentaje > LIMITE_PORCENTAJE_UNIDAD && (
                          <p className="text-[11px] text-red-600 mb-2">Ningún tema puede superar el {LIMITE_PORCENTAJE_UNIDAD}% de la calificación final.</p>
                        )}
                        <NotaRevisor items={obsPara('especifica', { unidad: c.numero }).filter(o => !o.categoria)} />
                        {planeacionActual && <HiloComentarios planeacionId={planeacionActual.id} seccion="especifica" unidad={c.numero} />}

                        {/* Secciones del tema: estado a simple vista y acceso directo */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-1">
                          {CATEGORIAS.map(cat => {
                            const lista = categoriaCompleta(c, cat.id)
                            const conObs = obsPara('especifica', { unidad: c.numero, categoria: cat.id }).length > 0
                            const Icono = ICONO_CATEGORIA[cat.id]
                            return (
                              <button key={cat.id} type="button" onClick={() => setVistaCompetencia({ idx, cat: cat.id })}
                                className={`group relative flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all hover:shadow-sm ${
                                  conObs ? 'border-red-200 bg-red-50/50 hover:border-red-300'
                                    : lista ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
                                    : 'border-slate-200 bg-white hover:border-brand-600/40'
                                }`}>
                                <span className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${
                                  conObs ? 'bg-red-100 text-red-600' : lista ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 group-hover:text-brand-600'
                                }`}>
                                  <Icono className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-xs font-medium text-slate-700 leading-tight">{cat.label}</span>
                                  <span className={`block text-[10px] leading-tight mt-0.5 ${conObs ? 'text-red-600' : lista ? 'text-emerald-700' : 'text-amber-600'}`}>
                                    {conObs ? 'Con observaciones' : lista ? 'Completa' : 'Pendiente'}
                                  </span>
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>

                {form.competencias.length > 0 && !sumaOk && (
                  <p className="text-xs mt-3 mb-4 text-amber-700">
                    La suma de porcentajes por tema es {sumaPorcentajes}%; debe cubrir exactamente el 100%.
                  </p>
                )}

                {form.competencias.length > 0 && (
                  <div className="mt-4">
                    <ResumenHoras competencias={form.competencias} materia={cargaActual?.materia} />
                  </div>
                )}
              </div>
            )

          })()}

          {/* La dosificación (avance real vs. planeado, por subtema) ya no es un paso aparte
              — vive como una vista más dentro de "Calendario de horas" (ver vistaHoras
              === 'dosificacion' más abajo), para no duplicar la misma tabla en dos pantallas. */}

          {/* 5. Calendario de horas — resultado de dosificar Horas T/P por subtema */}
          {paso === 'calendario_horas' && (() => {
            const distribucion = distribucionHorasSemanales(form.competencias)
            const maxHoras = Math.max(1, ...distribucion.map(s => s.teoria + s.practica))
            const semanas = Array.from({ length: TOTAL_SEMANAS }, (_, i) => i + 1)
            const fechaInicioPeriodo = periodoActual?.fecha_inicio
            const temasSemana = temasPorSemana(form.competencias)
            const semanaActual = semanaActualDePeriodo(fechaInicioPeriodo)

            return (
              <div>
                <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">5. Calendario de horas</label>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                      <button type="button" onClick={() => setVistaHoras('gantt')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${vistaHoras === 'gantt' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        Por tema (Gantt)
                      </button>
                      <button type="button" onClick={() => setVistaHoras('resumen')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${vistaHoras === 'resumen' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        Resumen semanal
                      </button>
                      <button type="button" onClick={() => setVistaHoras('dosificacion')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${vistaHoras === 'dosificacion' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        Dosificación
                      </button>
                    </div>
                    {semanaActual != null && vistaHoras !== 'dosificacion' && (
                      <button
                        type="button"
                        onClick={() => document.getElementById(`col-semana-${semanaActual}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })}
                        className="px-2.5 py-1.5 rounded-md text-[11px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        Ir a semana actual
                      </button>
                    )}
                    {planeacionActual && (
                      <button type="button" onClick={() => descargarPdfCalendario()} disabled={descargandoPdf}
                        className="px-2.5 py-1.5 rounded-md text-[11px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                        {descargandoPdf ? 'Generando…' : 'Descargar PDF'}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Distribución semanal de las horas teóricas y prácticas, calculada automáticamente a partir de la
                  dosificación: cada subtema reparte las horas T/P de su fila de actividades entre las semanas en las
                  que lo programaste.
                </p>

                <ResumenHoras
                  competencias={form.competencias}
                  materia={cargaActual?.materia}
                  onIrAUnidad={i => { cambiarPaso('especificas'); setVistaCompetencia({ idx: i, cat: 'analisis' }) }}
                />

                {vistaHoras === 'dosificacion' ? (
                  <div className="mt-4">
                    <p className="text-xs text-slate-400 mb-3">
                      De solo lectura: se calcula sola a partir de las Horas T/P que capturaste en cada fila de
                      actividades ("Competencias específicas → Análisis por Competencias"), en el orden de tus temas
                      y subtemas. La columna "Sem. realizado" la confirma Desarrollo Académico en cada corte.
                    </p>
                    <TablaDosificacion competencias={form.competencias} obsPara={obsPara} planeacionId={planeacionActual?.id} />
                  </div>
                ) : vistaHoras === 'gantt' ? (
                  <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-sm shadow-slate-200/50 mt-4">
                    <table className="text-xs border-collapse table-fixed w-full" style={{ minWidth: 960 }}>
                      <thead className="bg-slate-100/80">
                        <tr>
                          <th
                            className="sticky left-0 z-10 bg-slate-100 px-2 py-1.5 text-left font-medium text-slate-500 border-r border-slate-200 relative select-none"
                            style={{ width: anchoColumnaTema, minWidth: anchoColumnaTema, maxWidth: anchoColumnaTema }}
                          >
                            Tema / Subtema
                            <div
                              onMouseDown={iniciarResizeColumnaTema}
                              title="Arrastrar para redimensionar"
                              className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-brand-600/20 active:bg-brand-600/30"
                            />
                          </th>
                          {semanas.map(s => (
                            <th key={s} id={`col-semana-${s}`} className={`px-1.5 py-1.5 text-center font-medium text-slate-500 border-l border-slate-100 ${s === semanaActual ? 'bg-amber-100' : ''}`}>
                              <div>Sem {s}</div>
                              {fechaInicioPeriodo && (
                                <div className="text-[9px] font-normal text-slate-400 normal-case">{rangoFechasSemana(fechaInicioPeriodo, s)}</div>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {form.competencias.length === 0 && (
                          <tr><td className="px-2 py-3 text-slate-400" colSpan={semanas.length + 1}>Sin unidades registradas.</td></tr>
                        )}
                        {form.competencias.map((comp, cIdx) => {
                          const semanasTema = distribucionHorasSemanales([comp])
                          return (
                            <Fragment key={cIdx}>
                              <tr className="bg-slate-50/60">
                                <td
                                  className="sticky left-0 z-10 bg-slate-50 px-2 py-1.5 font-semibold text-slate-700 border-r border-slate-200 truncate"
                                  style={{ width: anchoColumnaTema, minWidth: anchoColumnaTema, maxWidth: anchoColumnaTema }}
                                  title={`Tema ${comp.numero}${comp.nombre_unidad ? `. ${comp.nombre_unidad}` : ''}`}
                                >
                                  Tema {comp.numero}{comp.nombre_unidad ? `. ${comp.nombre_unidad}` : ''}
                                </td>
                                {semanasTema.map(s => (
                                  <GanttCelda key={s.semana} teoria={s.teoria} practica={s.practica} />
                                ))}
                              </tr>
                              {comp.subtemas.map((sub, sIdx) => {
                                const dosIndex = comp.dosificacion.findIndex(d => d.subtema === sub.texto)
                                const semanasSub = dosIndex >= 0 ? horasPorSemanaDeSubtema(comp, dosIndex) : null
                                return (
                                  <tr key={`sub-${cIdx}-${sIdx}`}>
                                    <td
                                      className="sticky left-0 z-10 bg-white px-2 py-1 pl-5 text-slate-600 border-r border-slate-200 truncate"
                                      style={{ width: anchoColumnaTema, minWidth: anchoColumnaTema, maxWidth: anchoColumnaTema }}
                                      title={sub.texto || 'Subtema sin nombre'}
                                    >
                                      {sub.texto || <span className="text-slate-300 italic">Subtema sin nombre</span>}
                                    </td>
                                    {semanas.map((_, wIdx) => (
                                      <GanttCelda key={wIdx} teoria={semanasSub?.[wIdx].teoria ?? 0} practica={semanasSub?.[wIdx].practica ?? 0} />
                                    ))}
                                  </tr>
                                )
                              })}
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <>
                    {/* Pantallas pequeñas: tarjetas apiladas en vez de una tabla de 6 columnas. */}
                    <div className="sm:hidden space-y-2 mt-4">
                      {distribucion.map(s => {
                        const total = s.teoria + s.practica
                        return (
                          <div key={s.semana} className="border border-slate-100 rounded-lg p-2.5 space-y-1.5 bg-white">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-medium text-slate-700">
                                Sem {s.semana}
                                {fechaInicioPeriodo && <span className="block text-[10px] font-normal text-slate-400">{rangoFechasSemana(fechaInicioPeriodo, s.semana)}</span>}
                              </p>
                              <p className="text-[11px] text-slate-600 text-right shrink-0">
                                {total ? `${Math.round(total * 100) / 100}h` : <span className="text-slate-300">—</span>}
                                {!!total && <span className="block text-[10px] text-slate-400">T {s.teoria ? `${Math.round(s.teoria * 100) / 100}h` : '—'} · P {s.practica ? `${Math.round(s.practica * 100) / 100}h` : '—'}</span>}
                              </p>
                            </div>
                            {temasSemana[s.semana - 1].length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {temasSemana[s.semana - 1].map((t, i) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">{t}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-300">Sin contenido</span>
                            )}
                            {total > 0 && (
                              <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100">
                                <div className="bg-brand-500" style={{ width: `${(s.teoria / maxHoras) * 100}%` }} title={`Teoría: ${s.teoria}h`} />
                                <div className="bg-emerald-400" style={{ width: `${(s.practica / maxHoras) * 100}%` }} title={`Práctica: ${s.practica}h`} />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="hidden sm:block border border-slate-200 rounded-lg overflow-hidden shadow-sm shadow-slate-200/50 mt-4">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100/80">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-medium text-slate-500 w-16">Semana</th>
                            <th className="px-2 py-1.5 text-left font-medium text-slate-500 w-56">Tema / Subtema</th>
                            <th className="px-2 py-1.5 text-left font-medium text-slate-500">Distribución</th>
                            <th className="px-2 py-1.5 text-right font-medium text-slate-500 w-20">Teoría</th>
                            <th className="px-2 py-1.5 text-right font-medium text-slate-500 w-20">Práctica</th>
                            <th className="px-2 py-1.5 text-right font-medium text-slate-500 w-16">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 [&>tr:hover]:bg-slate-50/80">
                          {distribucion.map(s => {
                            const total = s.teoria + s.practica
                            return (
                              <tr key={s.semana}>
                                <td className="px-2 py-1.5 font-medium text-slate-700 align-top">
                                  Sem {s.semana}
                                  {fechaInicioPeriodo && <span className="block text-[10px] font-normal text-slate-400">{rangoFechasSemana(fechaInicioPeriodo, s.semana)}</span>}
                                </td>
                                <td className="px-2 py-1.5 align-top">
                                  {temasSemana[s.semana - 1].length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {temasSemana[s.semana - 1].map((t, i) => (
                                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">{t}</span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                                <td className="px-2 py-1.5 align-top">
                                  {total > 0 ? (
                                    <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100" style={{ maxWidth: 200 }}>
                                      <div className="bg-brand-500" style={{ width: `${(s.teoria / maxHoras) * 100}%` }} title={`Teoría: ${s.teoria}h`} />
                                      <div className="bg-emerald-400" style={{ width: `${(s.practica / maxHoras) * 100}%` }} title={`Práctica: ${s.practica}h`} />
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                                <td className="px-2 py-1.5 text-right text-slate-600 tabular-nums align-top">{s.teoria ? `${Math.round(s.teoria * 100) / 100}h` : '—'}</td>
                                <td className="px-2 py-1.5 text-right text-slate-600 tabular-nums align-top">{s.practica ? `${Math.round(s.practica * 100) / 100}h` : '—'}</td>
                                <td className="px-2 py-1.5 text-right font-medium text-slate-700 tabular-nums align-top">{total ? `${Math.round(total * 100) / 100}h` : '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {vistaHoras !== 'dosificacion' && (
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-500 inline-block" /> Teoría</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Práctica</span>
                    <span className="text-slate-400">· {TOTAL_SEMANAS} semanas del periodo{!fechaInicioPeriodo ? ' (sin fecha de inicio para mostrar fechas por semana)' : ''}</span>
                  </div>
                )}
              </div>
            )
          })()}

          {/* 6. Calendarización de evaluación (TecNM-AC-PO-003 §6) — generada automáticamente:
              cada unidad se evalúa una semana después de terminar su contenido dosificado, para
              dejarle al docente una semana de holgura para aplicar la evaluación y cargar
              calificaciones antes de que arranque la siguiente unidad. */}
          {paso === 'calendarizacion_evaluacion' && (() => {
            const evaluaciones = calendarizacionEvaluaciones(form.competencias)
            const fechaInicioPeriodo = periodoActual?.fecha_inicio
            const semanaActual = semanaActualDePeriodo(fechaInicioPeriodo)
            const volverACalendarizacion = `/docente/planeacion/${cargaId}?periodo=${periodoId}&paso=calendarizacion_evaluacion`
            const linkCalificacionesBase = grupoIdActual && cargaCanonicaCalificaciones
              ? `/docente/calificaciones/captura?grupo_id=${grupoIdActual}&carga_id=${cargaCanonicaCalificaciones.id}&periodo_id=${periodoId}&volver=${encodeURIComponent(volverACalendarizacion)}`
              : null
            const linkCalificaciones = linkCalificacionesBase
            const linkCalificacionesUnidad = (unidad: number) =>
              linkCalificacionesBase ? `${linkCalificacionesBase}&unidad=${unidad}` : null
            const pendientesDeCalificar = semanaActual != null
              ? evaluaciones.filter(ev => ev.semanaEvaluacion != null && ev.semanaEvaluacion <= semanaActual)
              : []
            return (
              <div>
                <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">6. Calendarización de evaluación</label>
                  {/* Acceso directo siempre visible a capturar calificaciones — no solo cuando
                      hay una unidad vencida (los avisos ámbar de abajo son solo para eso). */}
                  {linkCalificaciones && (
                    <Link to={linkCalificaciones} className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-[#234d7a] rounded-lg px-3 py-1.5 whitespace-nowrap transition-colors">
                      Capturar calificaciones →
                    </Link>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Se calcula sola a partir de la dosificación: cada unidad se evalúa la semana siguiente a la última semana
                  dosificada de su contenido — esa semana de holgura es para aplicar la evaluación y cargar calificaciones
                  antes de iniciar la siguiente unidad. La última unidad se marca como evaluación sumativa (ES); las demás,
                  formativa (EF).
                </p>

                {pendientesDeCalificar.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {pendientesDeCalificar.map(ev => (
                      <div key={ev.unidad} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">!</span>
                        <p className="flex-1 text-xs text-amber-800">
                          Ya llegó (o pasó) la semana {ev.semanaEvaluacion} de evaluación de el <span className="font-semibold">Tema {ev.unidad}{ev.nombreUnidad ? ` — ${ev.nombreUnidad}` : ''}</span> — carga las calificaciones en el sistema.
                        </p>
                        {linkCalificacionesUnidad(ev.unidad) ? (
                          <Link to={linkCalificacionesUnidad(ev.unidad)!} className="shrink-0 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg px-3 py-1.5 whitespace-nowrap transition-colors">
                            Ir a capturar calificaciones →
                          </Link>
                        ) : (
                          <span className="shrink-0 text-[11px] text-amber-500">Sin grupo asignado</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {evaluaciones.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">Registra unidades y dosifícalas para generar la calendarización.</p>
                ) : (
                  <>
                    {/* Pantallas pequeñas: tarjetas apiladas — la tabla de 4 columnas
                        obligaba al nombre del tema a partirse en muchas líneas y dejaba
                        todo apretado. */}
                    <div className="sm:hidden space-y-2">
                      {evaluaciones.map(ev => {
                        const pendiente = semanaActual != null && ev.semanaEvaluacion != null && ev.semanaEvaluacion <= semanaActual
                        return (
                          <div key={ev.unidad} className={`rounded-lg border p-3 space-y-2 ${pendiente ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-medium text-slate-700 flex-1 min-w-0">
                                Tema {ev.unidad}{ev.nombreUnidad ? ` — ${ev.nombreUnidad}` : ''}
                              </p>
                              <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${ev.tipo === 'ES' ? 'bg-indigo-100 text-indigo-700' : 'bg-brand-100 text-brand-700'}`}>
                                {ev.tipo}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>Última semana de contenido</span>
                              <span className="font-medium text-slate-600">
                                {ev.ultimaSemanaContenido != null ? `Sem ${ev.ultimaSemanaContenido}` : <span className="text-slate-300">Sin dosificar</span>}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                              <span className="shrink-0">Semana de evaluación</span>
                              {ev.semanaEvaluacion != null ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className="inline-flex flex-col items-end">
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Sem {ev.semanaEvaluacion}</span>
                                    {fechaInicioPeriodo && <span className="text-[10px] text-slate-400 mt-0.5">{rangoFechasSemana(fechaInicioPeriodo, ev.semanaEvaluacion)}</span>}
                                  </span>
                                  {linkCalificacionesUnidad(ev.unidad) && (
                                    <Link to={linkCalificacionesUnidad(ev.unidad)!} title={`Capturar calificaciones del Tema ${ev.unidad} — programada para la semana ${ev.semanaEvaluacion}`}
                                      className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-brand-600 bg-brand-600/10 hover:bg-brand-600/20 transition-colors">
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                      </svg>
                                    </Link>
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  <div className="hidden sm:block border border-slate-200 rounded-lg overflow-hidden shadow-sm shadow-slate-200/50">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100/80">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium text-slate-500">Tema</th>
                          <th className="px-2 py-1.5 text-center font-medium text-slate-500 w-40">Última semana de contenido</th>
                          <th className="px-2 py-1.5 text-center font-medium text-slate-500 w-44">Semana de evaluación</th>
                          <th className="px-2 py-1.5 text-center font-medium text-slate-500 w-28">Tipo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 [&>tr:hover]:bg-slate-50/80">
                        {evaluaciones.map(ev => {
                          const pendiente = semanaActual != null && ev.semanaEvaluacion != null && ev.semanaEvaluacion <= semanaActual
                          return (
                          <tr key={ev.unidad} className={pendiente ? 'bg-amber-50/60' : undefined}>
                            <td className="px-2 py-1.5 font-medium text-slate-700">
                              Tema {ev.unidad}{ev.nombreUnidad ? ` — ${ev.nombreUnidad}` : ''}
                            </td>
                            <td className="px-2 py-1.5 text-center text-slate-600">
                              {ev.ultimaSemanaContenido != null ? `Sem ${ev.ultimaSemanaContenido}` : <span className="text-slate-300">Sin dosificar</span>}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {ev.semanaEvaluacion != null ? (
                                <span className="inline-flex items-center gap-2 justify-center">
                                  <span className="inline-flex flex-col items-center">
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Sem {ev.semanaEvaluacion}</span>
                                    {fechaInicioPeriodo && <span className="text-[10px] text-slate-400 mt-0.5">{rangoFechasSemana(fechaInicioPeriodo, ev.semanaEvaluacion)}</span>}
                                  </span>
                                  {linkCalificacionesUnidad(ev.unidad) && (
                                    <Link to={linkCalificacionesUnidad(ev.unidad)!} title={`Capturar calificaciones del Tema ${ev.unidad} — programada para la semana ${ev.semanaEvaluacion}`}
                                      className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-brand-600 bg-brand-600/10 hover:bg-brand-600/20 transition-colors">
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                      </svg>
                                    </Link>
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ev.tipo === 'ES' ? 'bg-indigo-100 text-indigo-700' : 'bg-brand-100 text-brand-700'}`}>
                                {ev.tipo}
                              </span>
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  </>
                )}

                <p className="text-[11px] text-slate-400 mt-2">ED = Evaluación diagnóstica (se aplica al inicio del curso) · EF = Evaluación formativa · ES = Evaluación sumativa</p>
              </div>
            )
          })()}
          </div>
        </div>
      )}

      {modalFuente && (
        <ModalFuenteInformacion
          abierto={!!modalFuente}
          fuenteInicial={draftFuente}
          esEdicion={modalFuente.fIdx != null}
          modoInicial={modalFuente.modoInicial || 'individual'}
          todasLasFuentes={todasLasFuentesCatalog}
          unidadesDisponibles={unidadesDisponiblesCatalog}
          unidadActualIdx={modalFuente.idx}
          onCerrar={() => setModalFuente(null)}
          onGuardar={(resultado, unidadesTarget) => {
            const { idx, fIdx } = modalFuente
            const nuevasFuentes = Array.isArray(resultado) ? resultado : [resultado]
            const targets = unidadesTarget && unidadesTarget.length > 0 ? unidadesTarget : [idx]

            setForm(prev => {
              if (!prev) return null
              const compActualizadas = [...prev.competencias]
              targets.forEach(tIdx => {
                if (tIdx >= 0 && tIdx < compActualizadas.length) {
                  const actuales = compActualizadas[tIdx].fuentes_informacion || []

                  if (fIdx != null && tIdx === idx) {
                    compActualizadas[tIdx] = {
                      ...compActualizadas[tIdx],
                      fuentes_informacion: actuales.map((f, i) => i === fIdx ? nuevasFuentes[0] : f),
                    }
                  } else {
                    const agregables = nuevasFuentes.filter(nf =>
                      !actuales.some(af =>
                        af.titulo.trim().toLowerCase() === nf.titulo.trim().toLowerCase() &&
                        (af.autor || '').trim().toLowerCase() === (nf.autor || '').trim().toLowerCase()
                      )
                    )
                    if (agregables.length > 0) {
                      compActualizadas[tIdx] = {
                        ...compActualizadas[tIdx],
                        fuentes_informacion: [...actuales, ...agregables],
                      }
                    }
                  }
                }
              })
              return { ...prev, competencias: compActualizadas }
            })
            setModalFuente(null)
          }}
        />
      )}

      {modalHistorialAbierto && (
        <ModalWrap title="Historial de versiones" onClose={() => setModalHistorialAbierto(false)}>
          <div className="sm:col-span-2 space-y-2">
            <p className="text-xs text-slate-500 -mt-1 mb-2">
              Se guarda una versión cada vez que hay cambios reales al guardar o enviar a revisión. Restaurar una versión
              archiva primero el contenido actual, así que nunca se pierde nada.
            </p>
            {cargandoVersiones ? (
              <p className="text-xs text-slate-400 py-4 text-center">Cargando…</p>
            ) : versiones.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Aún no hay versiones anteriores guardadas.</p>
            ) : (
              versiones.map(v => (
                <div key={v.id} className="border border-slate-100 rounded-lg p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-700">{MOTIVO_VERSION_LABEL[v.motivo] ?? v.motivo}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(v.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    {v.creado_por && <p className="text-[11px] text-slate-400 mt-0.5">Por {v.creado_por}</p>}
                    {v.campos_cambiados.length > 0 ? (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Cambió: {v.campos_cambiados.map(c => CAMPO_VERSION_LABEL[c] ?? c).join(', ')}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-300 mt-1 italic">Sin diferencias con el contenido actual</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (confirm('¿Restaurar esta versión? El contenido actual se archivará antes de sobrescribirlo.')) mutRestaurar.mutate(v.id) }}
                    disabled={mutRestaurar.isPending || v.campos_cambiados.length === 0}
                    title={v.campos_cambiados.length === 0 ? 'Esta versión es idéntica al contenido actual' : 'Restaurar esta versión'}
                    className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline disabled:opacity-30 disabled:no-underline"
                  >
                    Restaurar
                  </button>
                </div>
              ))
            )}
          </div>
        </ModalWrap>
      )}

      {modalCompararAbierto && (
        <ModalWrap title="Comparar grupos" onClose={() => setModalCompararAbierto(false)}>
          <div className="sm:col-span-2 space-y-3">
            {cargandoComparativa ? (
              <p className="text-xs text-slate-400 py-4 text-center">Cargando…</p>
            ) : !comparativa || comparativa.grupos.length <= 1 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No das esta materia a más de un grupo este periodo — no hay nada que comparar.
              </p>
            ) : (
              <>
                <p className="text-xs text-slate-500 -mt-1">
                  {comparativa.materia} — semana actual del periodo: {comparativa.semana_actual ?? '—'} de {comparativa.total_semanas}
                </p>
                {comparativa.grupos.map(g => {
                  const enEsteEditor = g.carga_academica_id === cargaId
                  return (
                    <div key={g.carga_academica_id} className={`border rounded-lg p-3 ${enEsteEditor ? 'border-brand-600/30 bg-brand-600/5' : 'border-slate-100'}`}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-xs font-semibold text-slate-700">
                          {g.grupos}{enEsteEditor && <span className="ml-1.5 text-[10px] font-normal text-brand-600">(este grupo)</span>}
                        </p>
                        <span className="text-[10px] text-slate-400">{g.estatus ?? 'sin planeación'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-brand-600" style={{ width: `${g.porcentaje_dosificado}%` }} />
                        </div>
                        <span className="text-[11px] text-slate-500 tabular-nums shrink-0">{g.porcentaje_dosificado}%</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {g.ultima_semana_contenido != null ? `Última semana con contenido dosificado: ${g.ultima_semana_contenido}` : 'Sin dosificación registrada'}
                        {!!g.semanas_atras_del_lider && (
                          <span className="text-amber-600"> · va {g.semanas_atras_del_lider} semana{g.semanas_atras_del_lider !== 1 ? 's' : ''} atrás del grupo más avanzado</span>
                        )}
                      </p>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </ModalWrap>
      )}

      {modalPapeleraAbierto && (
        <ModalWrap title="Papelera" onClose={() => setModalPapeleraAbierto(false)}>
          <div className="sm:col-span-2 space-y-2">
            <p className="text-xs text-slate-500 -mt-1 mb-2">
              Indicadores, evidencias y actividades que borraste en esta sesión de edición — se pierden si recargas la página.
            </p>
            {papelera.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">La papelera está vacía.</p>
            ) : (
              papelera.map(entry => (
                <div key={entry.id} className="border border-slate-100 rounded-lg p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {entry.tipo === 'indicador' ? 'Indicador' : entry.tipo === 'evidencia' ? 'Evidencia' : 'Actividad'}
                      </span>
                      <span className="text-[11px] text-slate-400">Tema {entry.unidadNumero}</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5 truncate">{entry.etiqueta}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => restaurarDePapelera(entry.id)}
                    className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    Restaurar
                  </button>
                </div>
              ))
            )}
          </div>
        </ModalWrap>
      )}

      {!!modalInstrumento && (
        <ModalInstrumentoEvaluacion
          abierto={!!modalInstrumento}
          evidencia={modalInstrumento.evidencia}
          ponderacion={modalInstrumento.ponderacion}
          competencia={modalInstrumento.competencia}
          actividadAprendizaje={modalInstrumento.actividadAprendizaje}
          valorInicial={modalInstrumento.valorInicial}
          onCerrar={() => setModalInstrumento(null)}
          onAplicar={(nuevaDesc) => {
            if (modalInstrumento) {
              setFilaMatriz(modalInstrumento.unidadIdx, modalInstrumento.filaIdx, { evaluacion_formativa: nuevaDesc })
            }
          }}
        />
      )}

      {modalVistaPrevia && planeacionConFormActual && (
        <ModalWrap title={`Vista Previa — ${cargaActual?.materia?.nombre ?? 'Instrumentación Didáctica'}`} onClose={cerrarVistaPrevia} maxWidth="max-w-6xl" noGrid>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => cambiarTabVistaPrevia('web')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    vistaPreviaTab === 'web'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📄 Documento Estructurado
                </button>
                <button
                  type="button"
                  onClick={() => cambiarTabVistaPrevia('pdf')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    vistaPreviaTab === 'pdf'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📑 PDF Oficial (TecNM)
                </button>
              </div>

              <div className="flex items-center gap-2">
                {esSuperAdmin && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded-lg px-2.5 py-1 shadow-sm">
                    <span className="font-medium text-slate-600">Fecha de emisión:</span>
                    <input
                      type="date"
                      value={fechaEmisionPdf || (planeacionActual?.entregada_en ? planeacionActual.entregada_en.substring(0, 10) : new Date().toISOString().substring(0, 10))}
                      onChange={(e) => {
                        const val = e.target.value
                        setFechaEmisionPdf(val)
                        if (vistaPreviaTab === 'pdf') {
                          cargarPdfPreview(val)
                        }
                      }}
                      className="px-1.5 py-0.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-brand-600 focus:outline-none"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => descargarPdfInstrumentacion()}
                  disabled={descargandoPdfInstrumentacion}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {descargandoPdfInstrumentacion ? 'Descargando…' : 'Descargar PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir
                </button>
              </div>
            </div>

            {vistaPreviaTab === 'web' && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 max-h-[72vh] overflow-y-auto space-y-4">
                <PlaneacionDetalle p={planeacionConFormActual} />
              </div>
            )}

            {vistaPreviaTab === 'pdf' && (
              <div className="bg-slate-100 border border-slate-200 rounded-xl overflow-hidden h-[72vh] flex items-center justify-center">
                {cargandoPdfPreview ? (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <svg className="w-5 h-5 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generando vista previa en PDF oficial TecNM…
                  </div>
                ) : pdfBlobUrl ? (
                  <iframe src={pdfBlobUrl} className="w-full h-full border-0" title="Vista previa PDF oficial TecNM" />
                ) : (
                  <div className="text-center p-6">
                    <p className="text-sm text-slate-500 mb-3">No se ha podido cargar la vista previa PDF.</p>
                    <button
                      type="button"
                      onClick={() => cargarPdfPreview()}
                      className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-[#234d7a]"
                    >
                      Reintentar cargar PDF
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalWrap>
      )}
    </div>
    </div>
  )
}
