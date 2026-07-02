import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type AlertaInasistencia } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'

const PCT_COLOR = (pct: number) =>
  pct >= 50 ? 'text-red-700 bg-red-100' : pct >= 25 ? 'text-orange-700 bg-orange-100' : 'text-yellow-700 bg-yellow-100'

export default function AlertasInasistenciaPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const { data, isLoading } = useQuery({
    queryKey: ['alertas-inasistencia'],
    queryFn: () => academicoApi.getAlertasInasistencia(),
  })

  const alertas: AlertaInasistencia[] = data?.data ?? []

  const mutLeer = useMutation({
    mutationFn: (id: string) => academicoApi.marcarAlertaLeida(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alertas-inasistencia'] })
      toastSuccess('Alerta marcada como leída.')
    },
    onError: () => toastError('Error al actualizar la alerta.'),
  })

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Alertas de Inasistencia</h1>
          <p className="text-sm text-slate-500 mt-0.5">Alumnos que han superado el 25% de inasistencias</p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">Cargando alertas…</p>
          </div>
        ) : alertas.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <svg className="w-10 h-10 text-green-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-slate-500 text-sm">Sin alertas activas. Todos los alumnos están dentro del rango aceptable.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Alumno</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Grupo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">% Inasistencia</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Leída</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alertas.map(a => {
                  const yoLei = a.leida_director || a.leida_jefe || a.leida_docente
                  return (
                    <tr key={a.id} className={`transition-colors ${yoLei ? 'bg-slate-50/50' : 'hover:bg-orange-50/50'}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{a.alumno?.name ?? '—'}</p>
                        <p className="text-xs text-slate-400">{a.alumno?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-700">{a.grupo?.clave ?? '—'}</p>
                        <p className="text-xs text-slate-400">{a.grupo?.carrera?.nombre} — {a.grupo?.periodo?.nombre}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${PCT_COLOR(a.porcentaje_inasistencia)}`}>
                          {a.porcentaje_inasistencia.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className={a.leida_docente ? 'text-green-600' : 'text-slate-400'}>Docente {a.leida_docente ? '✓' : '○'}</span>
                          <span className={a.leida_jefe ? 'text-green-600' : 'text-slate-400'}>Jefe {a.leida_jefe ? '✓' : '○'}</span>
                          <span className={a.leida_director ? 'text-green-600' : 'text-slate-400'}>Director {a.leida_director ? '✓' : '○'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(a.created_at).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => mutLeer.mutate(a.id)}
                          disabled={mutLeer.isPending}
                          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                        >
                          Marcar leída
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
