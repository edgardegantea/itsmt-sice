import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { academicoApi } from '../services/academico'
import { usePeriodoActivo } from '../../../hooks/usePeriodoActivo'

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
          <div className="text-2xl font-bold text-[#1b396a]">96.2%</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">F-03-01 Instrumentación Didáctica</div>
          <div className="text-[11px] text-emerald-600 font-medium">Límite oficial: 17 sep 2026</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-2xl font-bold text-purple-700">14</div>
          <div className="text-xs font-semibold text-slate-700 mt-0.5">Canalizaciones F-05-04 a Tutorías</div>
          <div className="text-[11px] text-purple-600 font-medium">Inasistencia &ge; 50% o riesgo</div>
        </div>
      </div>

      {/* Matriz SGI G4 Formatos Oficio Circular DET/ITSMT/DA/0041/2026 */}
      <div className="bg-slate-900 text-white rounded-xl p-5 mb-6 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Normativa TecNM · Ago-Dic 2026
            </span>
            <span className="text-xs text-slate-300 font-medium">Oficio Circular DET/ITSMT/DA/0041/2026</span>
          </div>
          <Link to="/comunicados/oficio-circular" className="text-xs text-amber-300 hover:text-amber-200 underline">
            Ver Oficio Completo & Acuses →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <div className="font-bold text-amber-400">F-03-01</div>
            <div className="text-[10px] text-slate-300 mt-0.5">Instrumentación</div>
            <div className="text-[9px] text-emerald-400 mt-1 font-semibold">✓ Al inicio</div>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <div className="font-bold text-amber-400">F-03-02</div>
            <div className="text-[10px] text-slate-300 mt-0.5">Avance en línea</div>
            <div className="text-[9px] text-blue-400 mt-1 font-semibold">En cada corte</div>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <div className="font-bold text-amber-400">F-03-03</div>
            <div className="text-[10px] text-slate-300 mt-0.5">Eval. Desempeño</div>
            <div className="text-[9px] text-slate-400 mt-1">Periodo eval</div>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <div className="font-bold text-red-400">F-03-04</div>
            <div className="text-[10px] text-slate-300 mt-0.5">Causa Raíz</div>
            <div className="text-[9px] text-red-400 mt-1 font-semibold">Si rezago &ge; 25%</div>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <div className="font-bold text-amber-400">F-03-05</div>
            <div className="text-[10px] text-slate-300 mt-0.5">Guía Virtual</div>
            <div className="text-[9px] text-slate-400 mt-1">Mod. Mixta</div>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <div className="font-bold text-amber-400">F-03-06</div>
            <div className="text-[10px] text-slate-300 mt-0.5">Eval. Aprendizaje</div>
            <div className="text-[9px] text-slate-400 mt-1">Previo / Cierre</div>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <div className="font-bold text-emerald-400">F-03-07</div>
            <div className="text-[10px] text-slate-300 mt-0.5">Cumplimiento</div>
            <div className="text-[9px] text-emerald-400 mt-1 font-semibold">Al Cierre</div>
          </div>
        </div>
      </div>

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
                  <Link to={`/admin/gestion-academica/planeaciones/${f.planeacion_id}`} className="text-blue-600 hover:underline text-xs">
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
