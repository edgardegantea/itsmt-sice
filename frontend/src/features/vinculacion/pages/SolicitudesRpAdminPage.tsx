import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vinculacionApi, type SolicitudRp } from '../services/vinculacion'

const ESTATUS_COLOR: Record<string, string> = {
  pendiente_dictamen:       'bg-yellow-100 text-yellow-800',
  con_dictamen_aceptado:    'bg-green-100 text-green-800',
  con_dictamen_rechazado:   'bg-red-100 text-red-800',
}

const ESTATUS_LABEL: Record<string, string> = {
  pendiente_dictamen:     'Pendiente de dictamen',
  con_dictamen_aceptado:  'Dictamen aceptado',
  con_dictamen_rechazado: 'Dictamen rechazado',
}

function Badge({ estatus }: { estatus: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
      {ESTATUS_LABEL[estatus] ?? estatus}
    </span>
  )
}

type DictamenForm = {
  solicitud_rp_id: string
  anteproyecto: string
  empresa: string
  asesor_interno_id: string
  asesor_externo: string
  dictamen: 'aceptado' | 'rechazado'
  fecha_dictamen: string
}

export default function SolicitudesRpAdminPage() {
  const qc = useQueryClient()
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [dictamenOpen, setDictamenOpen] = useState<string | null>(null)
  const [form, setForm] = useState<DictamenForm>({
    solicitud_rp_id: '',
    anteproyecto: '',
    empresa: '',
    asesor_interno_id: '',
    asesor_externo: '',
    dictamen: 'aceptado',
    fecha_dictamen: new Date().toISOString().split('T')[0],
  })

  const params: Record<string, string> = {}
  if (filtroEstatus) params.estatus = filtroEstatus

  const { data, isLoading } = useQuery({
    queryKey: ['solicitudes-rp-admin', params],
    queryFn:  () => vinculacionApi.getSolicitudesRp(Object.keys(params).length ? params : undefined),
  })

  const mutDictamen = useMutation({
    mutationFn: (d: DictamenForm) => vinculacionApi.registrarDictamen(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes-rp-admin'] })
      setDictamenOpen(null)
    },
  })

  const mutCrearResidencia = useMutation({
    mutationFn: (solicitudId: string) => vinculacionApi.crearResidencia({ solicitud_rp_id: solicitudId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solicitudes-rp-admin'] }),
  })

  const solicitudes: SolicitudRp[] = data?.data ?? data ?? []

  const abrirDictamen = (s: SolicitudRp) => {
    setForm({
      solicitud_rp_id: s.id,
      anteproyecto: '',
      empresa: s.datos_empresa.nombre ?? '',
      asesor_interno_id: '',
      asesor_externo: '',
      dictamen: 'aceptado',
      fecha_dictamen: new Date().toISOString().split('T')[0],
    })
    setDictamenOpen(s.id)
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Solicitudes de Residencia Profesional</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestión de solicitudes y dictámenes de anteproyecto (TecNM-AC-PO-004-04).</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="border border-slate-200 rounded-md px-3 py-1.5 text-sm"
          value={filtroEstatus}
          onChange={e => setFiltroEstatus(e.target.value)}
        >
          <option value="">Todos los estatus</option>
          <option value="pendiente_dictamen">Pendiente de dictamen</option>
          <option value="con_dictamen_aceptado">Aceptadas</option>
          <option value="con_dictamen_rechazado">Rechazadas</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-slate-500 text-sm">Cargando…</p>
      ) : solicitudes.length === 0 ? (
        <p className="text-slate-400 text-sm">No hay solicitudes.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Alumno', 'NC', 'Empresa', 'Opción', 'Estatus', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {solicitudes.map((s: SolicitudRp) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {s.alumno?.user?.name ?? '—'}
                    {s.alumno?.carrera && (
                      <div className="text-xs text-slate-400">{s.alumno.carrera.nombre}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{s.alumno?.numero_control ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{s.datos_empresa?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{s.opcion?.replace('_', ' ')}</td>
                  <td className="px-4 py-3"><Badge estatus={s.estatus} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {s.estatus === 'pendiente_dictamen' && (
                        <button
                          onClick={() => abrirDictamen(s)}
                          className="px-2.5 py-1 rounded text-xs font-medium bg-blue-700 text-white hover:bg-blue-900"
                        >
                          Emitir dictamen
                        </button>
                      )}
                      {s.estatus === 'con_dictamen_aceptado' && !s.dictamen && (
                        <button
                          onClick={() => mutCrearResidencia.mutate(s.id)}
                          className="px-2.5 py-1 rounded text-xs font-medium bg-green-700 text-white hover:bg-green-900"
                        >
                          Crear expediente RP
                        </button>
                      )}
                      {s.dictamen && (
                        <button
                          onClick={() => window.open(vinculacionApi.getDictamenPdfUrl(s.dictamen!.id), '_blank')}
                          className="px-2.5 py-1 rounded text-xs border border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          Dictamen PDF
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal dictamen */}
      {dictamenOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Emitir Dictamen de Anteproyecto</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título del anteproyecto</label>
                <input
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  value={form.anteproyecto}
                  onChange={e => setForm(f => ({ ...f, anteproyecto: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Empresa</label>
                <input
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  value={form.empresa}
                  onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">UUID Asesor interno (docente)</label>
                <input
                  className="w-full border rounded px-3 py-1.5 text-sm font-mono"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={form.asesor_interno_id}
                  onChange={e => setForm(f => ({ ...f, asesor_interno_id: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Asesor externo</label>
                <input
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  value={form.asesor_externo}
                  onChange={e => setForm(f => ({ ...f, asesor_externo: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Dictamen</label>
                  <select
                    className="w-full border rounded px-3 py-1.5 text-sm"
                    value={form.dictamen}
                    onChange={e => setForm(f => ({ ...f, dictamen: e.target.value as 'aceptado' | 'rechazado' }))}
                  >
                    <option value="aceptado">Aceptado</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-1.5 text-sm"
                    value={form.fecha_dictamen}
                    onChange={e => setForm(f => ({ ...f, fecha_dictamen: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setDictamenOpen(null)}
                className="px-4 py-2 rounded text-sm border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => mutDictamen.mutate(form)}
                disabled={mutDictamen.isPending}
                className="px-4 py-2 rounded text-sm bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
              >
                {mutDictamen.isPending ? 'Guardando…' : 'Guardar dictamen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
