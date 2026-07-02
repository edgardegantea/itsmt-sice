import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { titulacionApi, type SalidaLateral } from '../services/titulacion'

const ESTATUS_COLOR: Record<string, string> = {
  solicitado:  'bg-blue-100 text-blue-800',
  en_revision: 'bg-yellow-100 text-yellow-800',
  aprobado:    'bg-green-100 text-green-800',
  rechazado:   'bg-red-100 text-red-800',
}

function Badge({ estatus }: { estatus: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
      {estatus}
    </span>
  )
}

export default function SalidaLateralAdminPage() {
  const qc = useQueryClient()
  const [filtroEstatus, setFiltroEstatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['salida-lateral-admin', filtroEstatus],
    queryFn:  () => titulacionApi.getSalidaLateral(filtroEstatus ? { estatus: filtroEstatus } : undefined),
  })

  const mutEstatus = useMutation({
    mutationFn: ({ id, estatus }: { id: string; estatus: 'en_revision' | 'aprobado' | 'rechazado' }) =>
      titulacionApi.actualizarEstatusSalidaLateral(id, estatus),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salida-lateral-admin'] }),
  })

  const registros: SalidaLateral[] = data?.data ?? data ?? []

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Solicitudes de Salida Lateral</h1>
        <p className="text-sm text-slate-500 mt-0.5">Revisión y diploma — alumno con ≥60% créditos que no continúa la carrera.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'solicitado', 'en_revision', 'aprobado', 'rechazado'].map(e => (
          <button key={e} onClick={() => setFiltroEstatus(e)}
            className={`text-xs px-3 py-1 rounded-full border transition ${filtroEstatus === e ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            {e || 'Todos'}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando…</p>}
      {registros.length === 0 && !isLoading && <p className="text-slate-400 text-sm">No hay solicitudes.</p>}

      <div className="space-y-3">
        {registros.map((s: SalidaLateral) => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-800">{s.alumno?.user?.name ?? '—'}</p>
                <p className="text-xs text-slate-400 font-mono">{s.alumno?.numero_control} · {s.alumno?.carrera?.nombre}</p>
                <p className="text-sm text-slate-600 mt-1">
                  Créditos al solicitar: <strong>{s.porcentaje_creditos_al_solicitar}%</strong>
                </p>
                <p className="text-sm text-slate-600">
                  Asignatura especialidad: <em>{s.asignaturaEspecialidad?.nombre ?? '—'}</em>
                </p>
                <p className="text-xs text-slate-400">Periodo: {s.periodoSolicitud?.nombre}</p>
                {s.aprobadoPor && (
                  <p className="text-xs text-green-600 mt-1">Aprobado por: {s.aprobadoPor.name}</p>
                )}
              </div>
              <Badge estatus={s.estatus} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {s.estatus === 'solicitado' && (
                <button onClick={() => mutEstatus.mutate({ id: s.id, estatus: 'en_revision' })}
                  className="text-xs px-3 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                  En revisión
                </button>
              )}
              {(s.estatus === 'solicitado' || s.estatus === 'en_revision') && (
                <>
                  <button onClick={() => mutEstatus.mutate({ id: s.id, estatus: 'aprobado' })}
                    className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700">
                    Aprobar
                  </button>
                  <button onClick={() => mutEstatus.mutate({ id: s.id, estatus: 'rechazado' })}
                    className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700">
                    Rechazar
                  </button>
                </>
              )}
              {s.estatus === 'aprobado' && (
                <a href={titulacionApi.getDiplomaSalidaLateralUrl(s.id)} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 border border-emerald-300 text-emerald-700 rounded hover:bg-emerald-50">
                  Generar Diploma PDF
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
