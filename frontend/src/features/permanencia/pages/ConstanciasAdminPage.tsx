import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { permanenciaApi, type Constancia, type TipoConstancia } from '../services/permanencia'
import { useConstanciaPdf } from '../hooks/useConstanciaPdf'

const TIPO_LABEL: Record<TipoConstancia, string> = {
  estudios:      'Constancia de estudios',
  inscripcion:   'Constancia de inscripción',
  calificaciones:'Constancia de calificaciones',
}

const ESTATUS_COLOR: Record<string, string> = {
  solicitada: 'bg-blue-100 text-blue-800',
  emitida:    'bg-green-100 text-green-800',
}

function Badge({ estatus }: { estatus: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
      {estatus === 'solicitada' ? 'Solicitada' : 'Emitida'}
    </span>
  )
}

export default function ConstanciasAdminPage() {
  const qc = useQueryClient()
  const [filtroEstatus,  setFiltroEstatus]  = useState('')
  const [filtroCarrera,  setFiltroCarrera]  = useState('')
  const { descargar, generando } = useConstanciaPdf()

  const { data: carreras = [] } = useQuery<{ id: string; nombre: string; clave: string }[]>({
    queryKey: ['carreras-select'],
    queryFn: () => apiClient.get('/carreras').then(r => r.data.data?.data ?? r.data.data),
  })

  const params: Record<string, string> = {}
  if (filtroEstatus) params.estatus    = filtroEstatus
  if (filtroCarrera) params.carrera_id = filtroCarrera

  const { data, isLoading } = useQuery({
    queryKey: ['constancias-admin', params],
    queryFn: () => permanenciaApi.getConstancias(Object.keys(params).length ? params : undefined),
  })

  const mutEmitir = useMutation({
    mutationFn: (id: string) => permanenciaApi.emitirConstancia(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['constancias-admin'] }),
  })

  const constancias: Constancia[] = data?.data ?? data ?? []

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Constancias</h1>
          <p className="text-sm text-slate-500 mt-0.5">Solicitudes recibidas de alumnos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={filtroCarrera}
            onChange={e => setFiltroCarrera(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
          >
            <option value="">Todas las carreras</option>
            {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
          </select>
          <select
            value={filtroEstatus}
            onChange={e => setFiltroEstatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
          >
            <option value="">Todos</option>
            <option value="solicitada">Solicitadas</option>
            <option value="emitida">Emitidas</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Cargando…</p>
      ) : constancias.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center">
          <p className="text-sm text-slate-500">No hay constancias.</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Alumno', 'NC', 'Tipo', 'Folio', 'Estatus', 'Fecha', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {constancias.map(c => (
                  <tr key={c.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.alumno?.user?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.alumno?.numero_control}</td>
                    <td className="px-4 py-3 text-slate-600">{TIPO_LABEL[c.tipo]}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.folio_unico}</td>
                    <td className="px-4 py-3"><Badge estatus={c.estatus} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {c.emitida_en ? new Date(c.emitida_en).toLocaleDateString('es-MX') : new Date(c.created_at).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        {c.estatus === 'solicitada' && (
                          <button
                            onClick={() => mutEmitir.mutate(c.id)}
                            disabled={mutEmitir.isPending}
                            className="text-xs font-medium text-green-700 hover:underline disabled:opacity-50"
                          >Emitir</button>
                        )}
                        {c.estatus === 'emitida' && (
                          <button
                            onClick={() => descargar(c)}
                            disabled={generando === c.id}
                            className="text-xs font-medium text-[#1a3a5c] hover:underline disabled:opacity-50"
                          >{generando === c.id ? 'Generando…' : 'PDF'}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {constancias.map(c => (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 px-4 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{c.alumno?.user?.name}</p>
                  <Badge estatus={c.estatus} />
                </div>
                <p className="text-xs text-slate-500">{TIPO_LABEL[c.tipo]} · <span className="font-mono">{c.folio_unico}</span></p>
                <div className="flex gap-2 mt-2">
                  {c.estatus === 'solicitada' && (
                    <button
                      onClick={() => mutEmitir.mutate(c.id)}
                      className="flex-1 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium"
                    >Emitir</button>
                  )}
                  {c.estatus === 'emitida' && (
                    <button
                      onClick={() => descargar(c)}
                      disabled={generando === c.id}
                      className="flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-primario)' }}
                    >{generando === c.id ? 'Generando…' : 'Descargar PDF'}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
