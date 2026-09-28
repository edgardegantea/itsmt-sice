import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { academicoApi } from '../services/academico'
import { FileStack, ChevronDown, NotebookPen, Activity, UserCheck, SearchX, MonitorPlay, ClipboardCheck, Flag, type LucideIcon } from 'lucide-react'
import { usePeriodoActivo } from '../../../hooks/usePeriodoActivo'

/** Formatos del SGI G4 citados en el Oficio Circular DET/ITSMT/DA/0041/2026 y cuándo aplica
 * cada uno. `alerta`: se genera solo ante un incumplimiento (no es de rutina). */
const FORMATOS_SGC: { clave: string; nombre: string; cuando: string; icono: LucideIcon; alerta?: boolean }[] = [
  { clave: 'F-03-01', nombre: 'Instrumentación didáctica', cuando: 'Al inicio del semestre', icono: NotebookPen },
  { clave: 'F-03-02', nombre: 'Avance en línea', cuando: 'En cada corte', icono: Activity },
  { clave: 'F-03-03', nombre: 'Evaluación del desempeño', cuando: 'Periodo de evaluación', icono: UserCheck },
  { clave: 'F-03-04', nombre: 'Análisis de causa raíz', cuando: 'Si el rezago es ≥ 25%', icono: SearchX, alerta: true },
  { clave: 'F-03-05', nombre: 'Guía virtual', cuando: 'Modalidad mixta', icono: MonitorPlay },
  { clave: 'F-03-06', nombre: 'Evaluación del aprendizaje', cuando: 'Previo y al cierre', icono: ClipboardCheck },
  { clave: 'F-03-07', nombre: 'Cumplimiento', cuando: 'Al cierre del semestre', icono: Flag },
]

function colorSemaforo(pct: number) {
  if (pct >= 90) return 'bg-emerald-100 text-emerald-700'
  if (pct >= 70) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

export default function SeguimientoInstrumentacionPage() {
  const { data: periodoActivo } = usePeriodoActivo()
  const [descargando, setDescargando] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['seguimiento-instrumentacion', periodoActivo?.id],
    queryFn: () => academicoApi.getSeguimientoPlaneaciones(periodoActivo ? { periodo_id: periodoActivo.id } : undefined),
    enabled: !!periodoActivo?.id,
  })

  const { data: acreditacion = [] } = useQuery({
    queryKey: ['acreditacion-por-carrera', periodoActivo?.id],
    queryFn: () => academicoApi.getAcreditacionPorCarrera(periodoActivo ? { periodo_id: periodoActivo.id } : undefined),
    enabled: !!periodoActivo?.id,
  })

  const filas = data?.filas ?? []
  const resumenDocentes = data?.resumen_docentes ?? []

  // Indicadores calculados con los datos reales del periodo (antes eran cifras fijas).
  const totalInstrumentaciones = acreditacion.reduce((n, c) => n + c.total, 0)
  const totalLiberadas = acreditacion.reduce((n, c) => n + c.liberadas, 0)
  const pctLiberadas = totalInstrumentaciones ? Math.round((totalLiberadas / totalInstrumentaciones) * 1000) / 10 : null
  const docentesConAtraso = resumenDocentes.filter(d => d.unidades_con_atraso > 0).length

  // La referencia de formatos se recuerda plegada/desplegada por usuario.
  const [formatosAbiertos, setFormatosAbiertos] = useState(() => {
    try { return localStorage.getItem('seguimiento-formatos') !== 'cerrado' } catch { return true }
  })
  const guardarFormatosAbiertos = (abierto: boolean) => {
    setFormatosAbiertos(abierto)
    try { localStorage.setItem('seguimiento-formatos', abierto ? 'abierto' : 'cerrado') } catch { /* sin almacenamiento */ }
  }
  const cargaTrabajo = data?.carga_trabajo ?? []

  const descargarPdf = async () => {
    setDescargando(true)
    try {
      await academicoApi.descargarSeguimientoPdf(periodoActivo ? { periodo_id: periodoActivo.id } : undefined)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <h1 className="text-xl font-semibold text-slate-800">Seguimiento de instrumentación didáctica</h1>
        <button type="button" onClick={descargarPdf} disabled={descargando || !data}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
          {descargando ? 'Generando…' : 'Descargar PDF'}
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Unidades con dosificación atrasada respecto a la semana actual del periodo, y evaluaciones cuya semana de
        holgura ya venció, agrupadas por docente y materia (todas las cargas académicas del periodo activo).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-2xl font-bold text-amber-600">{data?.total_atrasos ?? (isLoading ? '…' : 0)}</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">Unidades con dosificación atrasada</div>
          <div className="text-[11px] text-slate-400">Activa reporte F-03-04 si es &gt; 10%</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-2xl font-bold text-red-600">{data?.total_evaluaciones_vencidas ?? (isLoading ? '…' : 0)}</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">Evaluaciones vencidas sin cerrar</div>
          <div className="text-[11px] text-slate-400">Exige informe F-03-06 de jefatura</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-2xl font-bold text-brand-600">{pctLiberadas === null ? (isLoading ? '…' : '—') : `${pctLiberadas}%`}</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">Instrumentaciones liberadas (F-03-01)</div>
          <div className="text-[11px] text-slate-400">{totalLiberadas} de {totalInstrumentaciones} en el periodo</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-800">{docentesConAtraso}</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">Docentes con unidades atrasadas</div>
          <div className="text-[11px] text-slate-400">de {resumenDocentes.length} con carga en el periodo</div>
        </div>
      </div>

      {/* Formatos del SGI G4 que marca el Oficio Circular DET/ITSMT/DA/0041/2026: referencia de
          cuándo aplica cada uno. Plegable para no competir con los datos de la página. */}
      <details className="group bg-white rounded-xl border border-slate-200 mb-6 shadow-sm" open={formatosAbiertos}
        onToggle={e => guardarFormatosAbiertos((e.target as HTMLDetailsElement).open)}>
        <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-3 flex-wrap px-4 py-3">
          <span className="flex items-center gap-2 min-w-0">
            <FileStack className="w-4 h-4 text-brand-600 shrink-0" aria-hidden="true" />
            <span className="text-sm font-semibold text-slate-800">Formatos del SGC para el seguimiento</span>
            <span className="hidden sm:inline text-xs text-slate-400 truncate">· Oficio Circular DET/ITSMT/DA/0041/2026 · Ago–Dic 2026</span>
          </span>
          <span className="flex items-center gap-3">
            <Link to="/comunicados/oficio-circular" onClick={e => e.stopPropagation()}
              className="text-xs font-medium text-brand-600 hover:underline">Ver oficio y acuses</Link>
            <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
          </span>
        </summary>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-px bg-slate-100 border-t border-slate-100 rounded-b-xl overflow-hidden">
          {FORMATOS_SGC.map(f => {
            const Icono = f.icono
            return (
              <li key={f.clave} className="bg-white p-3 flex lg:flex-col gap-3 lg:gap-2">
                <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${f.alerta ? 'bg-red-50 text-red-600' : 'bg-brand-600/8 text-brand-600'}`}>
                  <Icono className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold text-slate-500 tabular-nums">{f.clave}</span>
                  <span className="block text-xs font-medium text-slate-800 leading-snug">{f.nombre}</span>
                  <span className={`block text-[11px] mt-0.5 ${f.alerta ? 'text-red-600 font-medium' : 'text-slate-500'}`}>{f.cuando}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </details>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="text-left px-3 py-2">Docente</th>
              <th className="text-left px-3 py-2">Materia</th>
              <th className="text-left px-3 py-2">Unidad</th>
              <th className="text-right px-3 py-2">Sem. actual</th>
              <th className="text-right px-3 py-2">Última sem. contenido</th>
              <th className="text-right px-3 py-2">Atraso</th>
              <th className="text-right px-3 py-2">Sem. evaluación</th>
              <th className="text-left px-3 py-2">Estado</th>
              <th className="text-left px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr><td className="px-3 py-6 text-center text-slate-400" colSpan={9}>Cargando…</td></tr>
            )}
            {!isLoading && filas.length === 0 && (
              <tr><td className="px-3 py-6 text-center text-slate-400" colSpan={9}>Sin atrasos ni evaluaciones vencidas por ahora.</td></tr>
            )}
            {filas.map((f, i) => (
              <tr key={`${f.planeacion_id}-${f.unidad}-${i}`} className="hover:bg-slate-50">
                <td className="px-3 py-2">{f.docente ?? '—'}</td>
                <td className="px-3 py-2">{f.materia ?? '—'}</td>
                <td className="px-3 py-2">Unidad {f.unidad}{f.nombre_unidad ? ` — ${f.nombre_unidad}` : ''}</td>
                <td className="px-3 py-2 text-right">{f.semana_actual}</td>
                <td className="px-3 py-2 text-right">{f.ultima_semana_contenido ?? '—'}</td>
                <td className="px-3 py-2 text-right">
                  {f.atraso_dosificacion_semanas > 0 ? (
                    <span className="text-amber-600 font-medium">{f.atraso_dosificacion_semanas} sem</span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-right">{f.semana_evaluacion ?? '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {f.evaluacion_vencida && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700">
                        Evaluación vencida
                      </span>
                    )}
                    {!f.evaluacion_vencida && f.atraso_dosificacion_semanas > 0 && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700">
                        Dosificación atrasada
                      </span>
                    )}
                    {f.evaluacion_vencida && f.tiene_calificaciones_capturadas && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700" title="Ya hay al menos una calificación capturada para esta unidad">
                        Calificaciones en curso
                      </span>
                    )}
                    {f.desfase_declarado && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700" title="La semana confirmada por Desarrollo Académico no coincide con la dosificación calculada">
                        Desfase declarado
                      </span>
                    )}
                    {f.recordatorio_enviado && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500" title="Ya se envió el correo de recordatorio para esta unidad">
                        Recordatorio enviado
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Link to={`/admin/gestion-academica/planeaciones/${f.planeacion_id}`} className="text-brand-600 hover:underline text-xs">
                    Ver planeación →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-semibold text-slate-700 mb-2">Cumplimiento por docente</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="text-left px-3 py-2">Docente</th>
              <th className="text-right px-3 py-2">Unidades totales</th>
              <th className="text-right px-3 py-2">Con atraso</th>
              <th className="text-left px-3 py-2">Cumplimiento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resumenDocentes.length === 0 && (
              <tr><td className="px-3 py-6 text-center text-slate-400" colSpan={4}>Sin datos aún.</td></tr>
            )}
            {resumenDocentes.map(d => (
              <tr key={d.docente_id} className="hover:bg-slate-50">
                <td className="px-3 py-2">{d.docente ?? '—'}</td>
                <td className="px-3 py-2 text-right">{d.total_unidades}</td>
                <td className="px-3 py-2 text-right">{d.unidades_con_atraso}</td>
                <td className="px-3 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${colorSemaforo(d.porcentaje_cumplimiento)}`}>
                    {d.porcentaje_cumplimiento}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cargaTrabajo.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Carga de trabajo — evaluaciones concurrentes</h2>
          <p className="text-xs text-slate-400 mb-2">Docentes con 2 o más materias que evalúan en la misma semana; puede anticipar sobrecarga de captura de calificaciones.</p>
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Docente</th>
                  <th className="text-right px-3 py-2">Semana de evaluación</th>
                  <th className="text-left px-3 py-2">Materias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cargaTrabajo.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2">{c.docente ?? '—'}</td>
                    <td className="px-3 py-2 text-right">Sem {c.semana_evaluacion}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{c.materias.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="text-sm font-semibold text-slate-700 mb-2">Acreditación — % de instrumentaciones liberadas por carrera</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="text-left px-3 py-2">Carrera</th>
              <th className="text-right px-3 py-2">Total</th>
              <th className="text-right px-3 py-2">Liberadas</th>
              <th className="text-left px-3 py-2">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {acreditacion.length === 0 && (
              <tr><td className="px-3 py-6 text-center text-slate-400" colSpan={4}>Sin datos aún.</td></tr>
            )}
            {acreditacion.map(c => (
              <tr key={c.carrera} className="hover:bg-slate-50">
                <td className="px-3 py-2">{c.carrera}</td>
                <td className="px-3 py-2 text-right">{c.total}</td>
                <td className="px-3 py-2 text-right">{c.liberadas}</td>
                <td className="px-3 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${colorSemaforo(c.porcentaje_liberadas)}`}>
                    {c.porcentaje_liberadas}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
