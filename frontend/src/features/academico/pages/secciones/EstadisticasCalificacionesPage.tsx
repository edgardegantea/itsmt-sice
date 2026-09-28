import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { academicoApi } from '../../services/academico'
import apiClient from '../../../../config/apiClient'

// Semáforo de color compartido por los tres indicadores — más alto es mejor para
// promedio/aprobación, más bajo es mejor para reprobación/deserción, así que cada
// llamada le pasa el umbral ya invertido según corresponda.
function semaforo(pct: number, bueno: number, regular: number) {
  if (pct >= bueno) return { text: 'text-emerald-600', bg: 'bg-emerald-500' }
  if (pct >= regular) return { text: 'text-amber-600', bg: 'bg-amber-500' }
  return { text: 'text-red-600', bg: 'bg-red-500' }
}

function BarraPct({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

export default function EstadisticasCalificacionesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const periodoId = searchParams.get('periodo_id') ?? ''

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos-lista'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; activo?: boolean }[]),
  })
  const periodoActual = periodos.find(p => p.id === periodoId)

  const { data: promedio = [], isLoading: cargandoPromedio, isError: errorPromedio } = useQuery({
    queryKey: ['indicador-promedio', periodoId],
    queryFn: () => academicoApi.getIndicadorPromedio({ periodo_id: periodoId || undefined }),
    enabled: !!periodoId,
  })

  const { data: reprobacion, isLoading: cargandoReprobacion, isError: errorReprobacion } = useQuery({
    queryKey: ['indicador-reprobacion', periodoId],
    queryFn: () => academicoApi.getIndicadorReprobacion({ periodo_id: periodoId || undefined }),
    enabled: !!periodoId,
  })

  // La deserción se calcula por cohorte de ingreso — se piden todas (sin acotar a este
  // periodo) para poder mostrar un panorama institucional agregado, no solo de quienes
  // ingresaron justo en este periodo.
  const { data: desercion = [], isLoading: cargandoDesercion, isError: errorDesercion } = useQuery({
    queryKey: ['indicador-desercion'],
    queryFn: () => academicoApi.getIndicadorDesercion({}),
  })

  const cargando = cargandoPromedio || cargandoReprobacion || cargandoDesercion
  const conError = errorPromedio || errorReprobacion || errorDesercion

  const porCarreraReprobacion = reprobacion?.por_carrera ?? []
  const porGrupo = reprobacion?.por_grupo ?? []

  // KPIs globales del periodo — agregados a partir de los totales por carrera para no
  // promediar promedios (se pesa por número de calificaciones/alumnos real).
  const totalCalificaciones = porCarreraReprobacion.reduce((s, c) => s + c.total_calificaciones, 0)
  const totalReprobados = porCarreraReprobacion.reduce((s, c) => s + c.total_reprobados, 0)
  const pctReprobacionGlobal = totalCalificaciones > 0 ? Math.round((totalReprobados / totalCalificaciones) * 10000) / 100 : 0
  const pctAprobacionGlobal = totalCalificaciones > 0 ? Math.round((100 - pctReprobacionGlobal) * 100) / 100 : 0

  const sumaPonderadaPromedio = promedio.reduce((s, c) => s + (c.promedio_general ?? 0) * c.total_calificaciones, 0)
  const promedioGlobal = totalCalificaciones > 0 ? Math.round((sumaPonderadaPromedio / totalCalificaciones) * 100) / 100 : null

  const totalInscritosDesercion = desercion.reduce((s, d) => s + d.total_inscritos, 0)
  const totalDesertoresGlobal = desercion.reduce((s, d) => s + d.total_desertores, 0)
  const pctDesercionGlobal = totalInscritosDesercion > 0 ? Math.round((totalDesertoresGlobal / totalInscritosDesercion) * 10000) / 100 : 0

  // Tabla combinada por carrera: cruza promedio + reprobación + deserción (deserción no
  // está acotada al periodo, se muestra la del histórico de esa carrera).
  const carreras = new Map<string, { carrera: string; promedio: number | null; totalCal: number; reprobados: number; pctReprobacion: number }>()
  for (const p of promedio) {
    carreras.set(p.carrera_id, { carrera: p.carrera, promedio: p.promedio_general, totalCal: p.total_calificaciones, reprobados: 0, pctReprobacion: 0 })
  }
  for (const r of porCarreraReprobacion) {
    const existente = carreras.get(r.carrera_id)
    if (existente) { existente.reprobados = r.total_reprobados; existente.pctReprobacion = r.pct_reprobacion }
    else carreras.set(r.carrera_id, { carrera: r.carrera, promedio: null, totalCal: r.total_calificaciones, reprobados: r.total_reprobados, pctReprobacion: r.pct_reprobacion })
  }
  const desercionPorCarreraId = new Map<string, { pct: number; desertores: number; inscritos: number }>()
  for (const d of desercion) {
    const acc = desercionPorCarreraId.get(d.carrera_id) ?? { pct: 0, desertores: 0, inscritos: 0 }
    acc.desertores += d.total_desertores
    acc.inscritos += d.total_inscritos
    acc.pct = acc.inscritos > 0 ? Math.round((acc.desertores / acc.inscritos) * 10000) / 100 : 0
    desercionPorCarreraId.set(d.carrera_id, acc)
  }
  const filasCarrera = [...carreras.entries()]
    .map(([carreraId, v]) => ({ carreraId, ...v, desercion: desercionPorCarreraId.get(carreraId) }))
    .sort((a, b) => a.carrera.localeCompare(b.carrera))

  const gruposMasReprobados = [...porGrupo]
    .filter(g => g.total_calificaciones > 0)
    .sort((a, b) => b.pct_reprobacion - a.pct_reprobacion)
    .slice(0, 10)

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-6">
        <div>
          <button
            onClick={() => navigate(periodoId ? `/admin/gestion-academica/calificaciones?periodo_id=${periodoId}` : '/admin/gestion-academica/calificaciones')}
            className="text-sm text-slate-500 hover:text-[#1a3a5c] mb-2 inline-flex items-center gap-1"
          >
            ← Volver a Captura de Calificaciones
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Estadísticas de Calificaciones</h1>
          <p className="text-sm text-slate-500 mt-1">
            Rendimiento académico por carrera y grupo · Periodo: <span className="font-medium text-slate-700">{periodoActual?.nombre ?? '—'}</span>
          </p>
        </div>

        {!periodoId ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">Selecciona un periodo desde Captura de Calificaciones para ver sus estadísticas.</p>
          </div>
        ) : conError ? (
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
            <p className="text-red-500 text-sm">Error al cargar los indicadores. Verifica tus permisos.</p>
          </div>
        ) : (
          <>
            {/* KPIs globales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500 font-medium">Promedio general</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{cargando ? '…' : promedioGlobal ?? '—'}</p>
                <p className="text-xs text-slate-400 mt-1">{totalCalificaciones} calificaciones capturadas</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500 font-medium">% Aprobación</p>
                <p className={`text-3xl font-bold mt-1 ${semaforo(pctAprobacionGlobal, 80, 60).text}`}>
                  {cargando ? '…' : `${pctAprobacionGlobal}%`}
                </p>
                <div className="mt-2"><BarraPct pct={pctAprobacionGlobal} color={semaforo(pctAprobacionGlobal, 80, 60).bg} /></div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500 font-medium">% Reprobación</p>
                <p className={`text-3xl font-bold mt-1 ${semaforo(100 - pctReprobacionGlobal, 80, 60).text}`}>
                  {cargando ? '…' : `${pctReprobacionGlobal}%`}
                </p>
                <p className="text-xs text-slate-400 mt-1">{totalReprobados} de {totalCalificaciones}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500 font-medium">% Deserción (histórico)</p>
                <p className={`text-3xl font-bold mt-1 ${semaforo(100 - pctDesercionGlobal, 90, 75).text}`}>
                  {cargando ? '…' : `${pctDesercionGlobal}%`}
                </p>
                <p className="text-xs text-slate-400 mt-1">{totalDesertoresGlobal} de {totalInscritosDesercion} alumnos</p>
              </div>
            </div>

            {/* Tabla por carrera */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">Rendimiento por Carrera</h2>
                <p className="text-xs text-slate-400 mt-0.5">Promedio y reprobación del periodo seleccionado · Deserción histórica de la carrera</p>
              </div>
              {cargando ? (
                <div className="flex justify-center items-center py-16 text-slate-400">Cargando indicadores…</div>
              ) : filasCarrera.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-400">
                  <p className="font-medium">Sin calificaciones capturadas en este periodo</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wide">Carrera</th>
                        <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wide">Promedio</th>
                        <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wide">% Reprobación</th>
                        <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs uppercase tracking-wide">% Deserción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filasCarrera.map(f => (
                        <tr key={f.carreraId} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-medium text-slate-800">{f.carrera}</td>
                          <td className="px-4 py-2.5 text-slate-600">{f.promedio ?? '—'}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 max-w-[160px]">
                              <span className={`text-xs font-medium ${semaforo(100 - f.pctReprobacion, 80, 60).text} w-12 shrink-0`}>{f.pctReprobacion}%</span>
                              <BarraPct pct={f.pctReprobacion} color={semaforo(100 - f.pctReprobacion, 80, 60).bg} />
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            {f.desercion ? (
                              <div className="flex items-center gap-2 max-w-[160px]">
                                <span className={`text-xs font-medium ${semaforo(100 - f.desercion.pct, 90, 75).text} w-12 shrink-0`}>{f.desercion.pct}%</span>
                                <BarraPct pct={f.desercion.pct} color={semaforo(100 - f.desercion.pct, 90, 75).bg} />
                              </div>
                            ) : <span className="text-xs text-slate-400">Sin datos</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Grupos con mayor reprobación */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">Grupos con mayor índice de reprobación</h2>
                <p className="text-xs text-slate-400 mt-0.5">Los 10 grupos con peor desempeño este periodo — útil para focalizar apoyo académico</p>
              </div>
              {cargando ? (
                <div className="flex justify-center items-center py-16 text-slate-400">Cargando…</div>
              ) : gruposMasReprobados.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-400">
                  <p className="font-medium">Sin calificaciones suficientes para calcular reprobación por grupo</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {gruposMasReprobados.map(g => (
                    <div key={g.grupo_id} className="px-5 py-3 flex items-center gap-4">
                      <div className="w-40 shrink-0">
                        <p className="text-sm font-medium text-slate-800">{g.grupo}</p>
                        <p className="text-xs text-slate-400">{g.carrera} · {g.semestre}°</p>
                      </div>
                      <div className="flex-1">
                        <BarraPct pct={g.pct_reprobacion} color={semaforo(100 - g.pct_reprobacion, 80, 60).bg} />
                      </div>
                      <span className={`text-sm font-semibold w-16 text-right ${semaforo(100 - g.pct_reprobacion, 80, 60).text}`}>
                        {g.pct_reprobacion}%
                      </span>
                      <span className="text-xs text-slate-400 w-24 text-right">{g.total_reprobados}/{g.total_calificaciones}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
