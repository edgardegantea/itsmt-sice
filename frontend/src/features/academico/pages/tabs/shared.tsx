import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../../../config/apiClient'
import type { EstatusPlaneacion, PlaneacionDocente, ObservacionCampo, SeccionObservacion } from '../../services/academico'
import { citarFuente, TIPO_FUENTE_LABEL } from '../planeacionCatalogo'

/**
 * Opciones de transición de estatus disponibles para una planeación, según su
 * estatus actual y los roles del usuario en sesión (cadena TecNM-AC-PO-003:
 * Docente -> Desarrollo Académico -> Jefatura de Carrera -> liberada).
 */
export function transicionesPlaneacion(estatus: EstatusPlaneacion, roles: string[]): { estatus: EstatusPlaneacion; label: string }[] {
  const tieneRol = (r: string[]) => r.some(x => roles.includes(x))

  if (estatus === 'enviada_da' && tieneRol(['desarrollo_academico', 'admin', 'superadmin'])) {
    return [
      { estatus: 'enviada_jc', label: 'Enviar a Jefatura de Carrera' },
      { estatus: 'devuelta_da', label: 'Devolver con observaciones' },
    ]
  }
  if (estatus === 'enviada_jc' && tieneRol(['jefe_carrera', 'admin', 'superadmin'])) {
    return [
      { estatus: 'liberada', label: 'Liberar' },
      { estatus: 'devuelta_jc', label: 'Devolver con observaciones' },
    ]
  }
  return []
}

function DetalleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{title}</p>
      <p className="text-sm text-slate-700 whitespace-pre-line">{children}</p>
    </div>
  )
}

/** Ancla de observación anidada dentro de PlaneacionDetalle: muestra las observaciones ya
 * capturadas para esta sección/unidad/categoría exacta y, en modo revisión, un botón para
 * agregar una nueva justo ahí — así el docente ve la observación pegada al contenido al que
 * corresponde en vez de un comentario general suelto. */
function AnchorObservaciones({ seccion, unidad, categoria, editable, observaciones, onAgregar, onQuitar }: {
  seccion: SeccionObservacion
  unidad?: number
  categoria?: string
  editable?: boolean
  observaciones: ObservacionCampo[]
  onAgregar?: (obs: Omit<ObservacionCampo, 'id'>) => void
  onQuitar?: (id: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')

  const propias = observaciones.filter(o =>
    o.seccion === seccion &&
    (unidad === undefined ? o.unidad == null : o.unidad === unidad) &&
    (categoria === undefined ? !o.categoria : o.categoria === categoria)
  )

  const guardar = () => {
    if (!texto.trim() || !onAgregar) return
    onAgregar({ seccion, unidad: unidad ?? null, categoria: categoria ?? null, texto: texto.trim() })
    setTexto('')
    setAbierto(false)
  }

  if (!editable && propias.length === 0) return null

  return (
    <div className="mt-1.5 space-y-1.5">
      {propias.map(o => (
        <div key={o.id} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <span className="shrink-0 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">!</span>
          <p className="text-xs text-amber-800 flex-1 whitespace-pre-line">{o.texto}</p>
          {editable && onQuitar && (
            <button type="button" onClick={() => onQuitar(o.id)} className="text-[11px] text-amber-700 hover:underline shrink-0">Quitar</button>
          )}
        </div>
      ))}
      {editable && (
        abierto ? (
          <div className="flex items-start gap-1.5">
            <textarea
              value={texto} onChange={e => setTexto(e.target.value)} rows={2} autoFocus
              placeholder="Escribe aquí qué debe corregir el docente…"
              className="flex-1 border border-amber-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <div className="flex flex-col gap-1 shrink-0">
              <button type="button" onClick={guardar} className="text-[11px] px-2 py-1 rounded-md bg-amber-500 text-white hover:bg-amber-600 whitespace-nowrap">Agregar</button>
              <button type="button" onClick={() => { setAbierto(false); setTexto('') }} className="text-[11px] px-2 py-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 whitespace-nowrap">Cancelar</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAbierto(true)} className="text-[11px] text-amber-600 hover:underline">+ Observación aquí</button>
        )
      )}
    </div>
  )
}

/** Vista del contenido completo de una planeación (TecNM-AC-PO-003), usada por los revisores
 * (Desarrollo Académico / Jefatura de Carrera) en vez de depender solo del PDF adjunto. Es de
 * solo lectura por defecto; pasando `editable` + `observaciones`/`onAgregarObservacion`/
 * `onQuitarObservacion` habilita botones "+ Observación aquí" en cada sección/unidad/categoría
 * para que el revisor ancle comentarios exactamente donde el docente debe corregir. */
export function PlaneacionDetalle({ p, editable, observaciones = [], onAgregarObservacion, onQuitarObservacion }: {
  p: PlaneacionDocente
  editable?: boolean
  observaciones?: ObservacionCampo[]
  onAgregarObservacion?: (obs: Omit<ObservacionCampo, 'id'>) => void
  onQuitarObservacion?: (id: string) => void
}) {
  const semanasConEvaluacion = (p.calendarizacion ?? []).filter(s => s.tipo_evaluacion)
  const sinNada = !p.caracterizacion && !p.intencion_didactica && !p.competencia_asignatura && !p.competencias?.length
    && semanasConEvaluacion.length === 0

  if (sinNada && !editable) {
    return <p className="text-sm text-slate-400">El docente aún no ha capturado contenido estructurado.</p>
  }

  const anchor = (seccion: SeccionObservacion, opts?: { unidad?: number; categoria?: string }) => (
    <AnchorObservaciones
      seccion={seccion} unidad={opts?.unidad} categoria={opts?.categoria}
      editable={editable} observaciones={observaciones}
      onAgregar={onAgregarObservacion} onQuitar={onQuitarObservacion}
    />
  )

  return (
    <div className="space-y-4">
      <div>
        {p.caracterizacion && <DetalleSection title="1. Caracterización de la asignatura">{p.caracterizacion}</DetalleSection>}
        {anchor('caracterizacion')}
      </div>
      <div>
        {p.intencion_didactica && <DetalleSection title="2. Intención didáctica">{p.intencion_didactica}</DetalleSection>}
        {anchor('intencion_didactica')}
      </div>
      <div>
        {p.competencia_asignatura && <DetalleSection title="3. Competencia de la asignatura">{p.competencia_asignatura}</DetalleSection>}
        {anchor('competencia_asignatura')}
      </div>

      {!!p.competencias?.length && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">4. Análisis por competencias específicas</p>
          <div className="space-y-3">
            {p.competencias.map((c, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs">
                <p className="font-semibold text-slate-700 text-sm">
                  Unidad {c.numero}{c.nombre_unidad ? ` — ${c.nombre_unidad}` : ''}
                  {c.porcentaje != null && <span className="ml-2 text-xs font-normal text-slate-400">({c.porcentaje}% de aportación a la materia)</span>}
                </p>
                {anchor('especifica', { unidad: c.numero })}
                {c.descripcion && <p><span className="text-slate-400">Competencia específica: </span>{c.descripcion}</p>}
                {!!c.actividades?.length && (
                  <div>
                    <span className="text-slate-400">Actividades de enseñanza y aprendizaje:</span>
                    <ul className="list-disc list-inside">
                      {c.actividades.map((a, j) => (
                        <li key={j}>
                          <span className="font-medium">N{a.numero}:</span>{' '}
                          {a.actividad_ensenanza && `Enseñanza: ${a.actividad_ensenanza}. `}
                          {a.actividad_aprendizaje && `Aprendizaje: ${a.actividad_aprendizaje}. `}
                          {(a.horas_teoricas != null || a.horas_practicas != null) && `(${a.horas_teoricas ?? 0} teóricas / ${a.horas_practicas ?? 0} prácticas)`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!!c.subtemas?.length && (
                  <p className="whitespace-pre-line">
                    <span className="text-slate-400">Temas y subtemas: </span>
                    {c.subtemas.map(s => s.texto + (s.fila != null ? ` (N${s.fila})` : '')).join(', ')}
                  </p>
                )}
                {!!c.competencias_genericas?.length && <p><span className="text-slate-400">Competencias genéricas: </span>{c.competencias_genericas.join(', ')}</p>}
                {anchor('especifica', { unidad: c.numero, categoria: 'analisis' })}
                {!!c.indicadores_alcance?.length && (
                  <div>
                    <span className="text-slate-400">Indicadores de alcance:</span>
                    <ul className="list-disc list-inside">
                      {c.indicadores_alcance.map((ind, j) => (
                        <li key={j}>{ind.letra ? `${ind.letra}. ` : ''}{ind.indicador}{ind.valor != null ? ` (${ind.valor}%)` : ''}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {c.niveles_desempeno?.some(n => n.indicadores) && (
                  <div>
                    <span className="text-slate-400">Niveles de desempeño:</span>
                    <ul className="list-disc list-inside">
                      {c.niveles_desempeno.filter(n => n.indicadores).map((n, j) => (
                        <li key={j}>{n.nivel} — {n.indicadores}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {!!c.matriz_evaluacion?.length && (
                  <div>
                    <span className="text-slate-400">Evidencias de aprendizaje:</span>
                    <ul className="list-disc list-inside">
                      {c.matriz_evaluacion.map((f, j) => (
                        <li key={j}>
                          {f.evidencia}{f.porcentaje != null ? ` (${f.porcentaje}%)` : ''}
                          {!!f.indicadores?.length && ` — indicadores: ${f.indicadores.join(', ')}`}
                          {f.evaluacion_formativa && ` — ${f.evaluacion_formativa}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {anchor('especifica', { unidad: c.numero, categoria: 'indicadores' })}
                {!!c.fuentes_informacion?.length && (
                  <p><span className="text-slate-400">Fuentes: </span>{c.fuentes_informacion.map(f => citarFuente(f) + (f.tipo ? ` (${TIPO_FUENTE_LABEL[f.tipo]})` : '')).join('; ')}</p>
                )}
                {anchor('especifica', { unidad: c.numero, categoria: 'fuentes' })}
                {!!c.apoyos_didacticos?.length && (
                  <p><span className="text-slate-400">Apoyo didáctico: </span>{c.apoyos_didacticos.join(', ')}</p>
                )}
                {anchor('especifica', { unidad: c.numero, categoria: 'apoyo' })}
                {!!c.practicas?.length && (
                  <div>
                    <span className="text-slate-400">Prácticas:</span>
                    <ul className="list-disc list-inside">
                      {c.practicas.map((pr, j) => (
                        <li key={j}>{pr.nombre}{pr.semana ? ` — ${pr.semana}` : ''}{pr.lugar ? ` (${pr.lugar})` : ''}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {anchor('especifica', { unidad: c.numero, categoria: 'practicas' })}
                {!!c.dosificacion?.length && (
                  <div>
                    <span className="text-slate-400">Dosificación:</span>
                    <ul className="list-disc list-inside">
                      {c.dosificacion.map((s, j) => (
                        <li key={j}>
                          {s.subtema || '—'}
                          {s.semana_inicio != null && s.semana_fin != null ? ` (sem. ${s.semana_inicio}-${s.semana_fin})` : ''}
                          {s.semana_realizado != null ? ` — realizado sem. ${s.semana_realizado}` : ' — pendiente'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {anchor('dosificacion', { unidad: c.numero })}
              </div>
            ))}
          </div>
        </div>
      )}

      {(semanasConEvaluacion.length > 0 || editable) && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">5. Calendarización de evaluación</p>
          <div className="flex flex-wrap gap-1.5">
            {semanasConEvaluacion.map(s => (
              <span key={s.semana} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                Sem {s.semana}: {s.tipo_evaluacion}{s.tp ? ' · TP' : ''}{s.tr ? ' · TR' : ''}{s.sd ? ' · SD' : ''}
              </span>
            ))}
          </div>
          {anchor('calendarizacion')}
        </div>
      )}
    </div>
  )
}

export const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50'
export const inputErrCls = 'w-full border border-red-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white disabled:bg-slate-50'
export const selectCls = inputCls
export const icls = (e?: string) => e ? inputErrCls : inputCls

export function Field({ label, children, full, error }: { label: string; children: React.ReactNode; full?: boolean; error?: string }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const
const DIA_LABEL_CORTO: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
}

/** Editor de horario personalizado por día de la semana (0 días marcados = sin restricción). */
export function HorarioPorDiaEditor({ value, onChange }: {
  value: { dia_semana: string; hora_inicio: string; hora_fin: string }[]
  onChange: (v: { dia_semana: string; hora_inicio: string; hora_fin: string }[]) => void
}) {
  function porDia(dia: string) {
    return value.find(v => v.dia_semana === dia)
  }

  function toggleDia(dia: string, activo: boolean) {
    if (activo) {
      onChange([...value, { dia_semana: dia, hora_inicio: '07:00', hora_fin: '14:00' }])
    } else {
      onChange(value.filter(v => v.dia_semana !== dia))
    }
  }

  function setHora(dia: string, campo: 'hora_inicio' | 'hora_fin', hora: string) {
    onChange(value.map(v => v.dia_semana === dia ? { ...v, [campo]: hora } : v))
  }

  return (
    <div className="space-y-1.5">
      {DIAS_SEMANA.map(dia => {
        const fila = porDia(dia)
        return (
          <div key={dia} className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 w-16 shrink-0 text-xs text-slate-600">
              <input type="checkbox" checked={!!fila} onChange={e => toggleDia(dia, e.target.checked)} />
              {DIA_LABEL_CORTO[dia]}
            </label>
            {fila ? (
              <>
                <input type="time" value={fila.hora_inicio} onChange={e => setHora(dia, 'hora_inicio', e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-xs" />
                <span className="text-xs text-slate-400">–</span>
                <input type="time" value={fila.hora_fin} onChange={e => setHora(dia, 'hora_fin', e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-xs" />
              </>
            ) : (
              <span className="text-xs text-slate-300">Sin restricción</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function extractApiErrors(e: unknown): Record<string, string> {
  const errs = (e as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors
  return errs ? Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]])) : {}
}

export function ModalWrap({ title, onClose, children, onSave, saving }: {
  title: string; onClose: () => void; children: React.ReactNode; onSave?: () => void; saving?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onKeyDown={e => { if (e.key === 'Escape' && !saving) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} disabled={saving} className="text-slate-400 hover:text-slate-700 text-2xl leading-none disabled:opacity-40">&times;</button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto">{children}</div>
        {onSave && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-40">Cancelar</button>
            <button onClick={onSave} disabled={saving} className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Table primitives ──────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc' | null

export function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{children}</th>
}

export function SortableTh({ children, field, sort, onSort }: {
  children: React.ReactNode
  field: string
  sort: { field: string; dir: SortDir }
  onSort: (f: string) => void
}) {
  const active = sort.field === field
  const dir = active ? sort.dir : null
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide select-none cursor-pointer hover:text-slate-800 transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}>
          {dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : '↕'}
        </span>
      </span>
    </th>
  )
}

export function useSorted<T>(data: T[], defaultField = '', defaultDir: SortDir = null) {
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: defaultField, dir: defaultDir })

  const onSort = useCallback((field: string) => {
    setSort(prev => ({
      field,
      dir: prev.field === field ? (prev.dir === 'asc' ? 'desc' : prev.dir === 'desc' ? null : 'asc') : 'asc',
    }))
  }, [])

  const sorted = sort.field && sort.dir
    ? [...data].sort((a, b) => {
        const av = getNestedVal(a, sort.field) as string | number
        const bv = getNestedVal(b, sort.field) as string | number
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sort.dir === 'asc' ? cmp : -cmp
      })
    : data

  return { sorted, sort, onSort }
}

function getNestedVal(obj: unknown, path: string): unknown {
  return path.split('.').reduce((o, k) => (o as Record<string, unknown>)?.[k], obj) ?? ''
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-slate-200 rounded animate-pulse"
                style={{ width: j === 0 ? '60%' : j === cols - 1 ? '40%' : '75%', animationDelay: `${i * 60}ms` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyRow({ cols, msg = 'Sin registros.' }: { cols: number; msg?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center">
        <div className="flex flex-col items-center gap-2">
          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <span className="text-sm text-slate-400">{msg}</span>
        </div>
      </td>
    </tr>
  )
}

// ── Capacity bar ──────────────────────────────────────────────────────────────

export function CapacityBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2 min-w-24">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums ${pct >= 100 ? 'text-red-600' : 'text-slate-700'}`}>
        {current}/{max}
      </span>
    </div>
  )
}

// ── Error helpers ─────────────────────────────────────────────────────────────

export { mutationError } from '@/utils/apiErrors'

// ── Shared queries ────────────────────────────────────────────────────────────

export function useCarreras() {
  return useQuery({
    queryKey: ['carreras-select'],
    queryFn: () => apiClient.get('/carreras').then(r => r.data.data as { id: string; nombre: string; clave: string }[]),
    staleTime: 60_000,
  })
}

export function usePeriodos() {
  return useQuery({
    queryKey: ['periodos-select'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; codigo?: string; activo: boolean; horarios_liberados: boolean }[]),
    staleTime: 60_000,
  })
}

export function usePlanteles() {
  return useQuery({
    queryKey: ['planteles-select'],
    queryFn: () => apiClient.get('/admin/catalogos/planteles').then(r => r.data.data as { id: number; nombre: string; clave: string; activo: boolean }[]),
    staleTime: 60_000,
  })
}

type AlumnoSelect = {
  id: string
  numero_control: string
  semestre_actual: number
  user?: { name: string }
  carrera?: { id: string; nombre: string; clave: string }
  inscripcion?: { aspirante?: { nombres: string; apellido_paterno: string; apellido_materno?: string } }
}

export function useAlumnos(params?: { carrera_id?: string; semestre?: number }) {
  return useQuery({
    queryKey: ['alumnos-select', params?.carrera_id, params?.semestre],
    enabled: params === undefined || !!params.carrera_id,
    queryFn: () => {
      const p: Record<string, string> = { per_page: '500' }
      if (params?.carrera_id) p.carrera_id = params.carrera_id
      if (params?.semestre)   p.semestre   = String(params.semestre)
      return apiClient.get('/alumnos', { params: p }).then(r => {
        const d = r.data.data
        return (Array.isArray(d) ? d : d.data ?? []) as AlumnoSelect[]
      })
    },
    staleTime: 30_000,
  })
}
