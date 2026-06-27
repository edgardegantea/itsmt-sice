import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type AlertaBajaDefinitiva } from '../services/academico'
import { useAuthStore } from '../../../store/authStore'

export default function AlertasPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [soloNoRevisadas, setSoloNoRevisadas] = useState(true)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['alertas-baja-definitiva', soloNoRevisadas],
    queryFn: () => academicoApi.getAlertas(soloNoRevisadas ? { revisada: false } : undefined),
  })

  const revisarMut = useMutation({
    mutationFn: (id: string) => academicoApi.revisarAlerta(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alertas-baja-definitiva'] })
      setConfirmandoId(null)
    },
  })

  const lista: AlertaBajaDefinitiva[] = data?.data ?? []

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Alertas de Baja Definitiva</h1>
        <p className="text-sm text-slate-500 mt-1">
          Alumnos que han reprobado la misma materia por tercera vez (intento especial) — Art. 66 RIES-TecNM
        </p>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soloNoRevisadas}
            onChange={e => setSoloNoRevisadas(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Mostrar solo pendientes de revisión
        </label>
        {data?.data !== undefined && (
          <span className="text-xs text-slate-400">{lista.length} alerta{lista.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Cargando alertas…</div>
      ) : lista.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl py-12 text-center text-slate-400 text-sm">
          {soloNoRevisadas
            ? 'No hay alertas pendientes de revisión.'
            : 'No hay alertas registradas.'}
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((alerta) => (
            <div
              key={alerta.id}
              className={`bg-white border rounded-xl p-4 sm:p-5 ${alerta.revisada ? 'border-slate-200 opacity-70' : 'border-red-200 bg-red-50/30'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">
                      {alerta.alumno?.user?.name ?? alerta.alumno_id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {alerta.alumno?.numero_control ?? ''}
                    </span>
                    {alerta.revisada ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        Revisada
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Pendiente
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mt-1">
                    Materia: <span className="font-medium">{alerta.materia_nombre}</span>
                    {' · '}Intento #{alerta.intento_numero}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Carrera: {alerta.alumno?.carrera?.nombre ?? '—'}
                    {alerta.grupo?.periodo?.nombre
                      ? ` · Periodo: ${alerta.grupo.periodo.nombre}`
                      : ''}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Registrada: {new Date(alerta.created_at).toLocaleDateString('es-MX')}
                  </p>
                  {alerta.revisada && alerta.revisada_en && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Revisada: {new Date(alerta.revisada_en).toLocaleDateString('es-MX')}
                      {alerta.revisada_por_user?.name ? ` por ${alerta.revisada_por_user.name}` : ''}
                    </p>
                  )}
                </div>

                {!alerta.revisada && (
                  <div className="shrink-0">
                    {confirmandoId === alerta.id ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => revisarMut.mutate(alerta.id)}
                          disabled={revisarMut.isPending}
                          className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 hover:bg-slate-800"
                        >
                          {revisarMut.isPending ? '…' : 'Confirmar'}
                        </button>
                        <button
                          onClick={() => setConfirmandoId(null)}
                          className="text-xs border border-slate-300 text-slate-600 px-2 py-1.5 rounded-lg"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmandoId(alerta.id)}
                        className="text-xs bg-white text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Marcar revisada
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
