import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToastStore } from '../../../store/toastStore'
import apiClient from '../../../config/apiClient'
import { inputCls, selectCls, mutationError } from '../../academico/pages/tabs/shared'

interface SolicitudBeca {
  id: string
  alumno_id: string
  periodo_id: string
  tipo_beca: string
  promedio?: number
  ingreso_familiar?: number
  estatus: string
  alumno?: { numero_control: string; user?: { name: string } }
  created_at: string
}

interface BecaAsignada {
  id: string
  alumno_id: string
  periodo_id: string
  tipo_beca: string
  monto_mensual?: number
  duracion_meses?: number
  estatus: string
  alumno?: { numero_control: string; user?: { name: string } }
}

interface Periodo { id: string; nombre: string }

export default function BecasAdminPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const [tab, setTab] = useState<'solicitudes' | 'padron'>('solicitudes')
  const [periodoId, setPeriodoId] = useState('')
  const [asignarModal, setAsignarModal] = useState<SolicitudBeca | null>(null)
  const [asignarForm, setAsignarForm] = useState({ monto_mensual: '', duracion_meses: '6', fecha_inicio: '' })
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [cancelarBeca, setCancelarBeca] = useState<BecaAsignada | null>(null)

  const { data: periodos = [] } = useQuery<Periodo[]>({
    queryKey: ['periodos-lista'],
    queryFn: () => apiClient.get('/periodos').then(r => r.data.data ?? []),
  })

  const { data: solicitudes, isLoading: loadingSol } = useQuery<{ data: SolicitudBeca[] }>({
    queryKey: ['solicitudes-beca', periodoId],
    queryFn: () => apiClient.get('/solicitudes-beca', { params: periodoId ? { periodo_id: periodoId } : {} }).then(r => r.data),
  })

  const { data: padron = [], isLoading: loadingPadron } = useQuery<BecaAsignada[]>({
    queryKey: ['padron-becas', periodoId],
    queryFn: () => apiClient.get(`/becas/padron/${periodoId}`).then(r => r.data.data ?? []),
    enabled: !!periodoId && tab === 'padron',
  })

  const mutValidar = useMutation({
    mutationFn: ({ id, estatus }: { id: string; estatus: string }) =>
      apiClient.patch(`/solicitudes-beca/${id}/validar`, { estatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes-beca'] })
      toastSuccess('Estatus actualizado.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutAsignar = useMutation({
    mutationFn: (solicitudId: string) => apiClient.post(`/solicitudes-beca/${solicitudId}/asignar`, {
      monto_mensual: parseFloat(asignarForm.monto_mensual),
      duracion_meses: parseInt(asignarForm.duracion_meses),
      fecha_inicio: asignarForm.fecha_inicio,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes-beca'] })
      qc.invalidateQueries({ queryKey: ['padron-becas'] })
      setAsignarModal(null)
      toastSuccess('Beca asignada correctamente.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutCancelar = useMutation({
    mutationFn: (becaId: string) => apiClient.patch(`/becas/${becaId}/cancelar`, { motivo_cancelacion: motivoCancelacion }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['padron-becas'] })
      setCancelarBeca(null)
      toastSuccess('Beca cancelada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const estatusColors: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-700',
    validada:  'bg-blue-100 text-blue-700',
    rechazada: 'bg-red-100 text-red-700',
    asignada:  'bg-green-100 text-green-700',
  }

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Módulo de Becas TecNM</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestión de solicitudes y padrón de becarios</p>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
          {(['solicitudes', 'padron'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {t === 'solicitudes' ? 'Solicitudes' : 'Padrón de becarios'}
            </button>
          ))}
        </div>
        <select value={periodoId} onChange={e => setPeriodoId(e.target.value)} className={`${selectCls} max-w-xs`}>
          <option value="">Todos los periodos</option>
          {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      {/* Solicitudes */}
      {tab === 'solicitudes' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Alumno</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tipo beca</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Promedio</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Estatus</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingSol ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">Cargando…</td></tr>
              ) : (solicitudes?.data ?? []).length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">Sin solicitudes</td></tr>
              ) : (solicitudes?.data ?? []).map(s => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{s.alumno?.user?.name ?? '—'}</p>
                    <p className="text-xs text-slate-400">{s.alumno?.numero_control}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{s.tipo_beca}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{s.promedio ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estatusColors[s.estatus] ?? 'bg-slate-100 text-slate-600'}`}>
                      {s.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {s.estatus === 'pendiente' && (
                        <>
                          <button
                            onClick={() => mutValidar.mutate({ id: s.id, estatus: 'validada' })}
                            className="text-xs text-blue-600 hover:underline"
                          >Validar</button>
                          <button
                            onClick={() => mutValidar.mutate({ id: s.id, estatus: 'rechazada' })}
                            className="text-xs text-red-500 hover:underline"
                          >Rechazar</button>
                        </>
                      )}
                      {s.estatus === 'validada' && (
                        <button
                          onClick={() => {
                            setAsignarModal(s)
                            setAsignarForm({ monto_mensual: '', duracion_meses: '6', fecha_inicio: '' })
                          }}
                          className="text-xs text-green-600 hover:underline"
                        >Asignar beca</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Padrón */}
      {tab === 'padron' && !periodoId && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
          Selecciona un periodo para ver el padrón de becarios.
        </div>
      )}

      {tab === 'padron' && periodoId && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Becario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Monto mensual</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Estatus</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingPadron ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">Cargando…</td></tr>
              ) : padron.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">Sin becarios en este periodo</td></tr>
              ) : padron.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{b.alumno?.user?.name ?? '—'}</p>
                    <p className="text-xs text-slate-400">{b.alumno?.numero_control}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{b.tipo_beca}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">
                    {b.monto_mensual ? `$${Number(b.monto_mensual).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.estatus === 'activa' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {b.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.estatus === 'activa' && (
                      <button
                        onClick={() => { setCancelarBeca(b); setMotivoCancelacion('') }}
                        className="text-xs text-red-500 hover:underline"
                      >Cancelar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal asignar */}
      {asignarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Asignar beca</h3>
            <p className="text-sm text-slate-500">{asignarModal.alumno?.user?.name} — <span className="capitalize">{asignarModal.tipo_beca}</span></p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Monto mensual ($)</label>
                <input type="number" value={asignarForm.monto_mensual} onChange={e => setAsignarForm(f => ({ ...f, monto_mensual: e.target.value }))} className={inputCls} min={0} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Duración (meses)</label>
                <input type="number" value={asignarForm.duracion_meses} onChange={e => setAsignarForm(f => ({ ...f, duracion_meses: e.target.value }))} className={inputCls} min={1} max={12} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha inicio</label>
                <input type="date" value={asignarForm.fecha_inicio} onChange={e => setAsignarForm(f => ({ ...f, fecha_inicio: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setAsignarModal(null)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm">Cancelar</button>
              <button
                onClick={() => mutAsignar.mutate(asignarModal.id)}
                disabled={mutAsignar.isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >{mutAsignar.isPending ? 'Guardando…' : 'Asignar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cancelar */}
      {cancelarBeca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Cancelar beca</h3>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Motivo de cancelación</label>
              <textarea
                value={motivoCancelacion}
                onChange={e => setMotivoCancelacion(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder="Ej. Reprobó materias clave…"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setCancelarBeca(null)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm">Cerrar</button>
              <button
                onClick={() => mutCancelar.mutate(cancelarBeca.id)}
                disabled={mutCancelar.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >{mutCancelar.isPending ? 'Cancelando…' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
