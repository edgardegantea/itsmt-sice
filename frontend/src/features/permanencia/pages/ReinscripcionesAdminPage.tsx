import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { permanenciaApi, type Reinscripcion } from '../services/permanencia'

const ESTATUS_COLOR: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobada:  'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
}

function Badge({ estatus }: { estatus: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
      {estatus.charAt(0).toUpperCase() + estatus.slice(1)}
    </span>
  )
}

function AccionModal({ r, onClose }: { r: Reinscripcion; onClose: () => void }) {
  const qc = useQueryClient()
  const [estatus, setEstatus] = useState<'aprobada' | 'rechazada'>('aprobada')
  const [observaciones, setObservaciones] = useState('')

  const mut = useMutation({
    mutationFn: () => permanenciaApi.actualizarEstatusReinscripcion(r.id, estatus, observaciones || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reinscripciones-admin'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Gestionar reinscripción</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {r.alumno?.user?.name} — NC: {r.alumno?.numero_control}
          </p>
        </div>

        <div className="flex gap-3">
          {(['aprobada', 'rechazada'] as const).map(e => (
            <button
              key={e}
              onClick={() => setEstatus(e)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition ${
                estatus === e
                  ? e === 'aprobada' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-200 text-slate-500'
              }`}
            >
              {e === 'aprobada' ? 'Aprobar' : 'Rechazar'}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Observaciones (opcional)</label>
          <textarea
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c] resize-none"
            placeholder="Motivo de rechazo o nota…"
          />
        </div>

        {mut.isError && (
          <p className="text-xs text-red-600">{(mut.error as any)?.response?.data?.message ?? 'Error al actualizar.'}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancelar</button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primario)' }}
          >
            {mut.isPending ? 'Guardando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReinscripcionesAdminPage() {
  const qc = useQueryClient()
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [seleccionada, setSeleccionada] = useState<Reinscripcion | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['reinscripciones-admin', filtroEstatus],
    queryFn: () => permanenciaApi.getReinscripciones(filtroEstatus ? { estatus: filtroEstatus } : undefined),
  })

  const mutResello = useMutation({
    mutationFn: (id: string) => permanenciaApi.registrarResello(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reinscripciones-admin'] }),
  })

  const reinscripciones: Reinscripcion[] = data?.data ?? []

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Reinscripciones</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona las solicitudes del periodo activo.</p>
        </div>
        <select
          value={filtroEstatus}
          onChange={e => setFiltroEstatus(e.target.value)}
          className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c]"
        >
          <option value="">Todos los estatus</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Cargando reinscripciones…</p>
      ) : reinscripciones.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center">
          <p className="text-sm text-slate-500">No hay solicitudes de reinscripción.</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Alumno', 'NC', 'Carrera', 'Periodo', 'Estatus', 'Resello', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reinscripciones.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.alumno?.user?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 text-xs">{r.alumno?.numero_control}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">{r.alumno?.carrera?.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{r.periodo?.nombre}</td>
                    <td className="px-4 py-3"><Badge estatus={r.estatus} /></td>
                    <td className="px-4 py-3">
                      {r.resello_registrado
                        ? <span className="text-xs text-green-700">✓ {r.fecha_resello}</span>
                        : r.estatus === 'aprobada'
                          ? <button
                              onClick={() => mutResello.mutate(r.id)}
                              disabled={mutResello.isPending}
                              className="text-xs text-[#1a3a5c] hover:underline disabled:opacity-50"
                            >Registrar</button>
                          : <span className="text-xs text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {r.estatus === 'pendiente' && (
                        <button
                          onClick={() => setSeleccionada(r)}
                          className="text-xs font-medium text-[#1a3a5c] hover:underline"
                        >Gestionar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {reinscripciones.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 px-4 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{r.alumno?.user?.name}</p>
                  <Badge estatus={r.estatus} />
                </div>
                <p className="text-xs text-slate-500 font-mono">{r.alumno?.numero_control} · {r.alumno?.carrera?.nombre}</p>
                <p className="text-xs text-slate-500">{r.periodo?.nombre}</p>
                {r.estatus === 'pendiente' && (
                  <button
                    onClick={() => setSeleccionada(r)}
                    className="w-full mt-2 py-2 rounded-lg border border-[#1a3a5c] text-[#1a3a5c] text-sm font-medium"
                  >Gestionar</button>
                )}
                {r.estatus === 'aprobada' && !r.resello_registrado && (
                  <button
                    onClick={() => mutResello.mutate(r.id)}
                    className="w-full mt-2 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium"
                  >Registrar resello</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {seleccionada && <AccionModal r={seleccionada} onClose={() => setSeleccionada(null)} />}
    </div>
  )
}
