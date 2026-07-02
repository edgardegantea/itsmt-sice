import { useQuery } from '@tanstack/react-query'
import { academicoApi, type DashboardAsistencia } from '../services/academico'

function pctColor(pct?: number) {
  if (pct === undefined) return 'text-slate-500'
  if (pct >= 85) return 'text-emerald-600'
  if (pct >= 70) return 'text-amber-600'
  return 'text-red-600'
}

function pctBg(pct?: number) {
  if (pct === undefined) return 'bg-slate-100'
  if (pct >= 85) return 'bg-emerald-100'
  if (pct >= 70) return 'bg-amber-100'
  return 'bg-red-100'
}

export default function DashboardAsistenciaPage() {
  const { data, isLoading, isError } = useQuery<DashboardAsistencia>({
    queryKey: ['dashboard-asistencia'],
    queryFn: () => academicoApi.getDashboardAsistencia(),
  })

  const porCarrera = data?.por_carrera ?? []
  const totalAlertas = data?.total_alertas ?? 0

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard de Asistencia Institucional</h1>
          <p className="text-sm text-slate-500 mt-1">Indicadores de asistencia por carrera del periodo activo</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Carreras con datos</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{porCarrera.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Total alertas activas</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{totalAlertas}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Alumnos en alerta</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">
              {porCarrera.reduce((s, c) => s + (c.alumnos_en_alerta ?? 0), 0)}
            </p>
          </div>
        </div>

        {/* Tabla por carrera */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Asistencia por Carrera</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-16 text-slate-400">Cargando indicadores...</div>
          ) : isError ? (
            <div className="flex justify-center items-center py-16 text-red-500">Error al cargar datos. Verifica tus permisos.</div>
          ) : porCarrera.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <p className="font-medium">Sin datos de asistencia</p>
              <p className="text-sm mt-1">Los indicadores se calculan una vez que hay sesiones registradas</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-5 font-semibold text-slate-600">Carrera</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Grupos</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">% Asistencia prom.</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Grupos en alerta</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Alumnos en alerta</th>
                </tr>
              </thead>
              <tbody>
                {porCarrera.map((c, i) => {
                  const pct = c.pct_asistencia_promedio
                  return (
                    <tr key={c.carrera_id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-3 px-5 font-medium text-slate-800">{c.carrera_nombre}</td>
                      <td className="py-3 px-4 text-center text-slate-600">{c.total_grupos}</td>
                      <td className="py-3 px-4 text-center">
                        {pct !== undefined ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${pctBg(pct)} ${pctColor(pct)}`}>
                            {pct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {(c.grupos_en_alerta ?? 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            {c.grupos_en_alerta}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {(c.alumnos_en_alerta ?? 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            {c.alumnos_en_alerta}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">0</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
