import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { titulacionApi, type SolicitudActoProtocolario } from '../services/titulacion'

const ESTATUS_COLOR: Record<string, string> = {
  pendiente_revision:     'bg-yellow-100 text-yellow-800',
  no_procede:             'bg-red-100 text-red-800',
  con_no_inconveniencia:  'bg-blue-100 text-blue-800',
  agendado:               'bg-indigo-100 text-indigo-800',
  aprobado:               'bg-green-100 text-green-800',
  reprobado:              'bg-red-200 text-red-900',
  exento:                 'bg-purple-100 text-purple-800',
}

function Badge({ estatus }: { estatus: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
      {estatus.replace(/_/g, ' ')}
    </span>
  )
}

export default function SolicitudesActoAdminPage() {
  const qc = useQueryClient()
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [showModal, setShowModal] = useState<{ tipo: 'cni' | 'acto' | 'resultado'; solicitudId?: string; actoId?: string } | null>(null)

  // Form states
  const [cniForm, setCniForm] = useState({ procede: true, motivo_improcedencia: '' })
  const [actoForm, setActoForm] = useState({ fecha: '', hora: '10:00', lugar: '', folio: '' })
  const [resultadoForm, setResultadoForm] = useState({ resultado: 'aprobado' as 'aprobado' | 'reprobado', firmado_jefe: true, firmado_director: true })

  const { data, isLoading } = useQuery({
    queryKey: ['solicitudes-acto-admin', filtroEstatus],
    queryFn:  () => titulacionApi.getSolicitudesActo(filtroEstatus ? { estatus: filtroEstatus } : undefined),
  })

  const mutCNI = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { procede: boolean; motivo_improcedencia?: string } }) =>
      titulacionApi.emitirNoInconveniencia(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes-acto-admin'] })
      setShowModal(null)
    },
  })

  const mutActo = useMutation({
    mutationFn: (data: Parameters<typeof titulacionApi.programarActo>[0]) =>
      titulacionApi.programarActo(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes-acto-admin'] })
      setShowModal(null)
    },
  })

  const mutResultado = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof titulacionApi.registrarResultado>[1] }) =>
      titulacionApi.registrarResultado(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes-acto-admin'] })
      setShowModal(null)
    },
  })

  const registros: SolicitudActoProtocolario[] = data?.data ?? data ?? []

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Solicitudes de Acto Protocolario</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestión del flujo TecNM-AC-PO-006 — Titulación Integral.</p>
      </div>

      {/* Filtro */}
      <div className="flex gap-2">
        {['', 'pendiente_revision', 'con_no_inconveniencia', 'agendado', 'aprobado', 'reprobado', 'exento', 'no_procede'].map(e => (
          <button
            key={e}
            onClick={() => setFiltroEstatus(e)}
            className={`text-xs px-3 py-1 rounded-full border transition ${filtroEstatus === e ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            {e ? e.replace(/_/g, ' ') : 'Todos'}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando…</p>}

      <div className="space-y-3">
        {registros.map((s: SolicitudActoProtocolario) => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{s.alumno?.user?.name ?? '—'}</p>
                <p className="text-xs text-slate-400 font-mono">{s.alumno?.numero_control} · {s.alumno?.carrera?.nombre}</p>
                <p className="text-sm text-slate-600 mt-1">
                  Opción {s.modalidad?.opcion_numero} — {s.modalidad?.nombre}
                </p>
                {s.retake_plazo_hasta && (
                  <p className="text-xs text-orange-600 mt-1">Plazo retake: {s.retake_plazo_hasta}</p>
                )}
                {s.motivo_improcedencia && (
                  <p className="text-xs text-red-600 mt-1">Motivo: {s.motivo_improcedencia}</p>
                )}
              </div>
              <Badge estatus={s.estatus} />
            </div>

            {/* Acto programado */}
            {s.actoProtocolario && (
              <div className="mt-3 text-xs text-slate-500 bg-slate-50 rounded p-2 space-y-0.5">
                <p>Fecha: <strong>{s.actoProtocolario.fecha}</strong> {s.actoProtocolario.hora} · {s.actoProtocolario.lugar}</p>
                <p>Resultado: <strong className={s.actoProtocolario.resultado === 'aprobado' ? 'text-green-700' : s.actoProtocolario.resultado === 'reprobado' ? 'text-red-700' : 'text-slate-700'}>{s.actoProtocolario.resultado}</strong></p>
              </div>
            )}

            {/* Acciones */}
            <div className="mt-3 flex flex-wrap gap-2">
              {s.estatus === 'pendiente_revision' && (
                <button onClick={() => setShowModal({ tipo: 'cni', solicitudId: s.id })}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Revisar expediente (CNI)
                </button>
              )}
              {s.constanciaNoInconveniencia && (
                <a href={titulacionApi.getNoInconvenienciaPdfUrl(s.id)} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 border border-blue-300 text-blue-700 rounded hover:bg-blue-50">
                  CNI PDF (PO-006-02)
                </a>
              )}
              {s.estatus === 'con_no_inconveniencia' && (
                <button onClick={() => setShowModal({ tipo: 'acto', solicitudId: s.id })}
                  className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  Programar Acto (PO-006-03)
                </button>
              )}
              {s.actoProtocolario && (
                <a href={titulacionApi.getAvisoPdfUrl(s.actoProtocolario.id)} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 border border-indigo-300 text-indigo-700 rounded hover:bg-indigo-50">
                  Aviso PDF (PO-006-03)
                </a>
              )}
              {s.estatus === 'agendado' && s.actoProtocolario?.resultado === 'pendiente' && (
                <button onClick={() => setShowModal({ tipo: 'resultado', actoId: s.actoProtocolario!.id })}
                  className="text-xs px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-800">
                  Registrar resultado
                </button>
              )}
              {s.actoProtocolario?.resultado === 'aprobado' && s.modalidad?.requiere_examen && (
                <a href={titulacionApi.getActaPdfUrl(s.actoProtocolario.id)} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 border border-green-300 text-green-700 rounded hover:bg-green-50">
                  Acta Examen PDF
                </a>
              )}
              {s.actoProtocolario?.resultado === 'aprobado' && !s.modalidad?.requiere_examen && (
                <a href={titulacionApi.getConstanciaExencionPdfUrl(s.actoProtocolario.id)} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 border border-purple-300 text-purple-700 rounded hover:bg-purple-50">
                  Constancia Exención PDF
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal CNI */}
      {showModal?.tipo === 'cni' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md space-y-4 p-6">
            <h2 className="font-semibold text-slate-800">Revisión de Expediente — PO-006-02</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cniForm.procede}
                onChange={e => setCniForm(f => ({ ...f, procede: e.target.checked }))} />
              <span className="text-sm text-slate-700">El expediente procede (emitir Constancia de No Inconveniencia)</span>
            </label>
            {!cniForm.procede && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Motivo de improcedencia *</label>
                <textarea className="w-full border rounded px-3 py-2 text-sm" rows={3}
                  value={cniForm.motivo_improcedencia}
                  onChange={e => setCniForm(f => ({ ...f, motivo_improcedencia: e.target.value }))} />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
              <button
                onClick={() => mutCNI.mutate({ id: showModal.solicitudId!, data: { procede: cniForm.procede, motivo_improcedencia: cniForm.motivo_improcedencia || undefined } })}
                disabled={mutCNI.isPending || (!cniForm.procede && !cniForm.motivo_improcedencia)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {cniForm.procede ? 'Emitir CNI' : 'Marcar no procedente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Acto */}
      {showModal?.tipo === 'acto' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md space-y-4 p-6">
            <h2 className="font-semibold text-slate-800">Programar Acto Protocolario — PO-006-03</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha *</label>
                <input type="date" className="w-full border rounded px-3 py-1.5 text-sm"
                  value={actoForm.fecha} onChange={e => setActoForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Hora *</label>
                <input type="time" className="w-full border rounded px-3 py-1.5 text-sm"
                  value={actoForm.hora} onChange={e => setActoForm(f => ({ ...f, hora: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Lugar *</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm"
                  value={actoForm.lugar} onChange={e => setActoForm(f => ({ ...f, lugar: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Folio libro de actas</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm"
                  value={actoForm.folio} onChange={e => setActoForm(f => ({ ...f, folio: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
              <button
                onClick={() => mutActo.mutate({ solicitud_id: showModal.solicitudId!, fecha: actoForm.fecha, hora: actoForm.hora, lugar: actoForm.lugar, libro_actas_folio: actoForm.folio || undefined })}
                disabled={mutActo.isPending || !actoForm.fecha || !actoForm.lugar}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                Programar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Resultado */}
      {showModal?.tipo === 'resultado' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm space-y-4 p-6">
            <h2 className="font-semibold text-slate-800">Registrar resultado del Acto</h2>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Resultado *</label>
              <select className="w-full border rounded px-3 py-1.5 text-sm"
                value={resultadoForm.resultado}
                onChange={e => setResultadoForm(f => ({ ...f, resultado: e.target.value as 'aprobado' | 'reprobado' }))}>
                <option value="aprobado">APROBADO</option>
                <option value="reprobado">REPROBADO</option>
              </select>
            </div>
            {resultadoForm.resultado === 'reprobado' && (
              <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-3 py-2">
                Se activará plazo de 3 meses para nueva presentación (política 3.2 PO-006).
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
              <button
                onClick={() => mutResultado.mutate({ id: showModal.actoId!, data: { resultado: resultadoForm.resultado, firmado_jefe_servicios: resultadoForm.firmado_jefe, firmado_director: resultadoForm.firmado_director } })}
                disabled={mutResultado.isPending}
                className={`px-4 py-2 text-sm text-white rounded disabled:opacity-50 ${resultadoForm.resultado === 'aprobado' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Confirmar resultado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
