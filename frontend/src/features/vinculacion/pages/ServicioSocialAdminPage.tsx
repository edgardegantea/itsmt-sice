import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { vinculacionApi, type ServicioSocial } from '../services/vinculacion'

const ESTATUS_COLOR: Record<string, string> = {
  solicitado: 'bg-blue-100 text-blue-800',
  aprobado:   'bg-indigo-100 text-indigo-800',
  rechazado:  'bg-red-100 text-red-800',
  en_curso:   'bg-yellow-100 text-yellow-800',
  acreditado: 'bg-green-100 text-green-800',
}

function Badge({ estatus }: { estatus: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
      {estatus.replace('_', ' ')}
    </span>
  )
}

const TRANSICIONES: Record<string, { label: string; to: string }[]> = {
  solicitado: [
    { label: 'Aprobar', to: 'aprobado' },
    { label: 'Rechazar', to: 'rechazado' },
  ],
  aprobado: [{ label: 'Iniciar', to: 'en_curso' }],
  en_curso:  [{ label: 'Acreditar', to: 'acreditado' }],
}

export default function ServicioSocialAdminPage() {
  const qc = useQueryClient()
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [actualizando, setActualizando] = useState<string | null>(null)

  const { data: carreras = [] } = useQuery<{ id: string; nombre: string; clave: string }[]>({
    queryKey: ['carreras-select'],
    queryFn:  () => apiClient.get('/carreras').then(r => r.data.data?.data ?? r.data.data),
  })

  const params: Record<string, string> = {}
  if (filtroEstatus) params.estatus    = filtroEstatus
  if (filtroCarrera) params.carrera_id = filtroCarrera

  const { data, isLoading } = useQuery({
    queryKey: ['servicio-social-admin', params],
    queryFn:  () => vinculacionApi.getServicioSocial(Object.keys(params).length ? params : undefined),
  })

  const mutEstatus = useMutation({
    mutationFn: ({ id, estatus, horas }: { id: string; estatus: string; horas?: number }) =>
      vinculacionApi.actualizarEstatusServicioSocial(id, {
        estatus: estatus as ServicioSocial['estatus'],
        horas_acumuladas: horas,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servicio-social-admin'] })
      setActualizando(null)
    },
  })

  const registros: ServicioSocial[] = data?.data ?? data ?? []

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Servicio Social</h1>
        <p className="text-sm text-slate-500 mt-0.5">Solicitudes y seguimiento de Servicio Social (TecNM-PO-004).</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          className="border border-slate-200 rounded-md px-3 py-1.5 text-sm"
          value={filtroEstatus}
          onChange={e => setFiltroEstatus(e.target.value)}
        >
          <option value="">Todos los estatus</option>
          <option value="solicitado">Solicitado</option>
          <option value="aprobado">Aprobado</option>
          <option value="rechazado">Rechazado</option>
          <option value="en_curso">En curso</option>
          <option value="acreditado">Acreditado</option>
        </select>

        <select
          className="border border-slate-200 rounded-md px-3 py-1.5 text-sm"
          value={filtroCarrera}
          onChange={e => setFiltroCarrera(e.target.value)}
        >
          <option value="">Todas las carreras</option>
          {carreras.map(c => (
            <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <p className="text-slate-500 text-sm">Cargando…</p>
      ) : registros.length === 0 ? (
        <p className="text-slate-400 text-sm">No hay registros.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Alumno', 'NC', 'Empresa', 'Estatus', 'Horas', 'Créditos', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registros.map((r: ServicioSocial) => {
                const transiciones = TRANSICIONES[r.estatus] ?? []
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.alumno?.user?.name ?? '—'}
                      {r.alumno?.carrera && (
                        <div className="text-xs text-slate-400">{r.alumno.carrera.nombre}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.alumno?.numero_control ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{r.empresa}</td>
                    <td className="px-4 py-3"><Badge estatus={r.estatus} /></td>
                    <td className="px-4 py-3 text-slate-600">{r.horas_acumuladas ?? 0}h</td>
                    <td className="px-4 py-3 text-slate-600">{r.creditos_otorgados ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {transiciones.map(t => (
                          <button
                            key={t.to}
                            disabled={mutEstatus.isPending && actualizando === r.id}
                            onClick={() => {
                              setActualizando(r.id)
                              const horas = t.to === 'acreditado' ? 480 : undefined
                              mutEstatus.mutate({ id: r.id, estatus: t.to, horas })
                            }}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-slate-700 text-white hover:bg-slate-900 disabled:opacity-50"
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
