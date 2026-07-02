import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authStore'
import {
  personalService,
  type SolicitudPersonal,
  type SolicitudParams,
} from '../services/personal'

const ESTATUS_BADGE: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobada:  'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
}

export default function SolicitudesPersonalPage() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()

  const [showForm, setShowForm]       = useState(false)
  const [resolving, setResolving]     = useState<SolicitudPersonal | null>(null)
  const [accion, setAccion]           = useState<'aprobada' | 'rechazada'>('aprobada')
  const [observaciones, setObs]       = useState('')

  const isDirector = user?.roles?.some((r: string) =>
    ['superadmin', 'admin', 'director_academico', 'direccion_academica', 'subdireccion_academica'].includes(r)
  )

  const { data: tiposResp } = useQuery({
    queryKey: ['tipos-solicitud'],
    queryFn: () => personalService.getTipos(),
  })
  const tipos = (tiposResp?.data as { data?: unknown[] })?.data ?? tiposResp?.data ?? []

  const { data: solResp, isLoading } = useQuery({
    queryKey: ['solicitudes-personal'],
    queryFn: () => personalService.getSolicitudes(),
  })
  const solicitudes: SolicitudPersonal[] = (solResp?.data as { data?: SolicitudPersonal[] })?.data ?? []

  // Form state
  const [form, setForm] = useState<Partial<SolicitudParams>>({})

  const crearMut = useMutation({
    mutationFn: (d: SolicitudParams) => personalService.crearSolicitud(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes-personal'] })
      setShowForm(false)
      setForm({})
    },
  })

  const resolverMut = useMutation({
    mutationFn: ({ id, estatus, obs }: { id: string; estatus: 'aprobada' | 'rechazada'; obs?: string }) =>
      personalService.resolverSolicitud(id, estatus, obs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['solicitudes-personal'] })
      setResolving(null)
      setObs('')
    },
  })

  const descargarPdf = async (sol: SolicitudPersonal) => {
    const resp = await personalService.descargarPermisoPdf(sol.id)
    const url  = URL.createObjectURL(resp.data as Blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `permiso_${sol.id.slice(0, 8)}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault()
    crearMut.mutate(form as SolicitudParams)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Permiso</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Nueva Solicitud
        </button>
      </div>

      {/* Formulario nueva solicitud */}
      {showForm && (
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Nueva Solicitud de Permiso</h2>
          <form onSubmit={handleCrear} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de permiso</label>
              <select
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.tipo_id ?? ''}
                onChange={e => setForm(f => ({ ...f, tipo_id: e.target.value }))}
              >
                <option value="">Seleccionar...</option>
                {Array.isArray(tipos) && tipos.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
              <input
                type="date"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.fecha_inicio ?? ''}
                onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
              <input
                type="date"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.fecha_fin ?? ''}
                onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
              <textarea
                required
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.motivo ?? ''}
                onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
              />
            </div>

            <div className="col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm({}) }}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={crearMut.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {crearMut.isPending ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal resolver */}
      {resolving && isDirector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-semibold text-lg mb-4">Resolver Solicitud</h2>
            <p className="text-sm text-gray-600 mb-4">
              Solicitante: <strong>{resolving.solicitante?.name}</strong>
            </p>

            <div className="flex gap-3 mb-4">
              {(['aprobada', 'rechazada'] as const).map(est => (
                <button
                  key={est}
                  onClick={() => setAccion(est)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                    accion === est
                      ? est === 'aprobada' ? 'bg-green-600 text-white border-green-600'
                                           : 'bg-red-600 text-white border-red-600'
                      : 'border-gray-300 text-gray-700'
                  }`}
                >
                  {est === 'aprobada' ? 'Aprobar' : 'Rechazar'}
                </button>
              ))}
            </div>

            <textarea
              placeholder="Observaciones (opcional en aprobación, recomendado al rechazar)"
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              value={observaciones}
              onChange={e => setObs(e.target.value)}
            />

            <div className="flex gap-3 justify-end">
              <button onClick={() => { setResolving(null); setObs('') }} className="px-4 py-2 border rounded-lg text-sm">
                Cancelar
              </button>
              <button
                onClick={() => resolverMut.mutate({ id: resolving.id, estatus: accion, obs: observaciones })}
                disabled={resolverMut.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Cargando solicitudes...</div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {isDirector && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Solicitante</th>}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha inicio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fecha fin</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Estatus</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {solicitudes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    No hay solicitudes registradas.
                  </td>
                </tr>
              ) : solicitudes.map(sol => (
                <tr key={sol.id} className="hover:bg-gray-50">
                  {isDirector && (
                    <td className="px-4 py-3 font-medium">{sol.solicitante?.name ?? '—'}</td>
                  )}
                  <td className="px-4 py-3">{sol.tipo?.nombre ?? '—'}</td>
                  <td className="px-4 py-3">{sol.fecha_inicio}</td>
                  <td className="px-4 py-3">{sol.fecha_fin}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTATUS_BADGE[sol.estatus]}`}>
                      {sol.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {isDirector && sol.estatus === 'pendiente' && (
                      <button
                        onClick={() => { setResolving(sol); setAccion('aprobada') }}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Resolver
                      </button>
                    )}
                    {sol.estatus === 'aprobada' && (
                      <button
                        onClick={() => descargarPdf(sol)}
                        className="text-green-700 hover:underline text-xs"
                      >
                        PDF
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
