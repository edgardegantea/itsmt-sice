import { useQuery } from '@tanstack/react-query'
import { academicoApi, type DashboardTutoria } from '../services/academico'

export default function DashboardTutoriaPage() {
  const { data, isLoading, isError } = useQuery<DashboardTutoria>({
    queryKey: ['dashboard-tutoria'],
    queryFn: () => academicoApi.getDashboardTutoria(),
  })

  const porTutor = data?.por_tutor ?? []

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard PIT — Programa Institucional de Tutoría</h1>
          <p className="text-sm text-slate-500 mt-1">Indicadores de tutoría del periodo activo</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Tutores activos</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{data?.tutores_activos ?? '—'}</p>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Tutorados asignados</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{data?.tutorados_asignados ?? '—'}</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Sesiones registradas</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{data?.sesiones_registradas ?? '—'}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-5">
            <p className="text-sm text-slate-500 font-medium">% Alumnos atendidos</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">
              {data?.pct_alumnos_atendidos !== undefined ? `${data.pct_alumnos_atendidos}%` : '—'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Actividad por Tutor</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-16 text-slate-400">Cargando indicadores...</div>
          ) : isError ? (
            <div className="flex justify-center items-center py-16 text-red-500">Error al cargar datos. Verifica tus permisos.</div>
          ) : porTutor.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <p className="font-medium">Sin tutores activos</p>
              <p className="text-sm mt-1">Registra tutores y asigna alumnos para ver indicadores</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-5 font-semibold text-slate-600">Tutor</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Correo</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Tutorados</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Sesiones</th>
                </tr>
              </thead>
              <tbody>
                {porTutor.map((t, i) => (
                  <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3 px-5 font-medium text-slate-800">{t.docente?.name ?? '—'}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{t.docente?.email ?? '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {t.tutorados ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        (t.sesiones_registradas ?? 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {t.sesiones_registradas ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
