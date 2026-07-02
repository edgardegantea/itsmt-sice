import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vinculacionApi, type ResidenciaProfesional } from '../services/vinculacion'

const ESTATUS_COLOR: Record<string, string> = {
  asignado:      'bg-blue-100 text-blue-800',
  en_curso:      'bg-yellow-100 text-yellow-800',
  acreditado:    'bg-green-100 text-green-800',
  no_acreditado: 'bg-red-100 text-red-800',
}

function Badge({ estatus }: { estatus: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
      {estatus.replace('_', ' ')}
    </span>
  )
}

export default function ResidenciasAdminPage() {
  const qc = useQueryClient()
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [asesorInput, setAsesorInput] = useState<Record<string, string>>({})
  const [seg1Input, setSeg1Input] = useState<Record<string, string>>({})
  const [seg2Input, setSeg2Input] = useState<Record<string, string>>({})
  const [reporteInput, setReporteInput] = useState<Record<string, string>>({})

  const params: Record<string, string> = {}
  if (filtroEstatus) params.estatus = filtroEstatus

  const { data, isLoading } = useQuery({
    queryKey: ['residencias-admin', params],
    queryFn:  () => vinculacionApi.getResidencias(Object.keys(params).length ? params : undefined),
  })

  const mutAsesor = useMutation({
    mutationFn: ({ id, asesorId }: { id: string; asesorId: string }) =>
      vinculacionApi.asignarAsesor(id, asesorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['residencias-admin'] }),
  })

  const mutSeg = useMutation({
    mutationFn: ({ id, tipo, cal }: { id: string; tipo: 'seguimiento_1' | 'seguimiento_2'; cal: number }) =>
      vinculacionApi.registrarSeguimiento(id, { tipo, calificacion: cal }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['residencias-admin'] }),
  })

  const mutReporte = useMutation({
    mutationFn: ({ id, cal }: { id: string; cal: number }) =>
      vinculacionApi.registrarEvaluacionReporte(id, cal),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['residencias-admin'] }),
  })

  const residencias: ResidenciaProfesional[] = data?.data ?? data ?? []

  const abrirOficio = (id: string) => {
    window.open(vinculacionApi.getOficioAsesorPdfUrl(id), '_blank')
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Residencias Profesionales</h1>
        <p className="text-sm text-slate-500 mt-0.5">Expedientes y evaluación de residencias (TecNM-AC-PO-004).</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="border border-slate-200 rounded-md px-3 py-1.5 text-sm"
          value={filtroEstatus}
          onChange={e => setFiltroEstatus(e.target.value)}
        >
          <option value="">Todos los estatus</option>
          <option value="asignado">Asignado</option>
          <option value="en_curso">En curso</option>
          <option value="acreditado">Acreditado</option>
          <option value="no_acreditado">No acreditado</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-slate-500 text-sm">Cargando…</p>
      ) : residencias.length === 0 ? (
        <p className="text-slate-400 text-sm">No hay residencias registradas.</p>
      ) : (
        <div className="space-y-4">
          {residencias.map((r: ResidenciaProfesional) => (
            <div key={r.id} className="border border-slate-200 rounded-lg p-5 space-y-4 bg-white shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800">{r.alumno?.user?.name ?? '—'}</p>
                  <p className="text-xs text-slate-500">{r.alumno?.numero_control} · {r.alumno?.carrera?.nombre}</p>
                  <p className="text-sm text-slate-600 mt-1">{r.empresa ?? '—'} · {r.proyecto ?? 'Sin proyecto'}</p>
                </div>
                <Badge estatus={r.estatus} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {/* Cal seguimiento 1 */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">Seguimiento 1 (10%)</p>
                  {r.calificacion_seguimiento_1 != null ? (
                    <p className="font-medium text-slate-700">{r.calificacion_seguimiento_1}</p>
                  ) : (
                    <div className="flex gap-1">
                      <input
                        type="number" min="0" max="100"
                        className="border rounded px-2 py-1 text-xs w-20"
                        placeholder="0-100"
                        value={seg1Input[r.id] ?? ''}
                        onChange={e => setSeg1Input(prev => ({ ...prev, [r.id]: e.target.value }))}
                      />
                      <button
                        onClick={() => mutSeg.mutate({ id: r.id, tipo: 'seguimiento_1', cal: Number(seg1Input[r.id]) })}
                        className="px-2 py-1 rounded text-xs bg-slate-700 text-white hover:bg-slate-900"
                      >
                        Guardar
                      </button>
                    </div>
                  )}
                </div>

                {/* Cal seguimiento 2 */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">Seguimiento 2 (10%)</p>
                  {r.calificacion_seguimiento_2 != null ? (
                    <p className="font-medium text-slate-700">{r.calificacion_seguimiento_2}</p>
                  ) : (
                    <div className="flex gap-1">
                      <input
                        type="number" min="0" max="100"
                        className="border rounded px-2 py-1 text-xs w-20"
                        placeholder="0-100"
                        value={seg2Input[r.id] ?? ''}
                        onChange={e => setSeg2Input(prev => ({ ...prev, [r.id]: e.target.value }))}
                      />
                      <button
                        onClick={() => mutSeg.mutate({ id: r.id, tipo: 'seguimiento_2', cal: Number(seg2Input[r.id]) })}
                        className="px-2 py-1 rounded text-xs bg-slate-700 text-white hover:bg-slate-900"
                      >
                        Guardar
                      </button>
                    </div>
                  )}
                </div>

                {/* Reporte final */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">Reporte Final (80%)</p>
                  {r.calificacion_reporte_final != null ? (
                    <p className="font-medium text-slate-700">
                      {r.calificacion_reporte_final}
                      {r.calificacion_final != null && (
                        <span className="ml-2 text-xs text-slate-500">→ Final: <strong>{r.calificacion_final}</strong></span>
                      )}
                    </p>
                  ) : (
                    <div className="flex gap-1">
                      <input
                        type="number" min="0" max="100"
                        className="border rounded px-2 py-1 text-xs w-20"
                        placeholder="0-100"
                        value={reporteInput[r.id] ?? ''}
                        onChange={e => setReporteInput(prev => ({ ...prev, [r.id]: e.target.value }))}
                      />
                      <button
                        onClick={() => mutReporte.mutate({ id: r.id, cal: Number(reporteInput[r.id]) })}
                        className="px-2 py-1 rounded text-xs bg-slate-700 text-white hover:bg-slate-900"
                      >
                        Guardar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Asesor interno */}
              <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center gap-3">
                <div className="text-sm">
                  <span className="text-slate-500 mr-1">Asesor interno:</span>
                  <span className="text-slate-800 font-medium">{r.asesor?.name ?? 'Sin asignar'}</span>
                </div>

                {!r.asesor_id && (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-xs w-48"
                      placeholder="UUID del docente"
                      value={asesorInput[r.id] ?? ''}
                      onChange={e => setAsesorInput(prev => ({ ...prev, [r.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => mutAsesor.mutate({ id: r.id, asesorId: asesorInput[r.id] })}
                      className="px-2 py-1 rounded text-xs bg-blue-700 text-white hover:bg-blue-900"
                    >
                      Asignar
                    </button>
                  </div>
                )}

                {r.asesor_id && (
                  <button
                    onClick={() => abrirOficio(r.id)}
                    className="px-3 py-1 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Oficio PDF
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
