import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { permanenciaApi, type Baja, type EstatusBaja } from '../services/permanencia'
import { useAuthStore } from '../../../store/authStore'

const TIPO_LABEL: Record<string, string> = {
  parcial:    'Baja parcial',
  temporal:   'Baja temporal',
  definitiva: 'Baja definitiva',
}

const ESTATUS_BADGE: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobada:  'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
}

const MOTIVO_LABEL: Record<string, string> = {
  economico:          'Económico',
  salud:              'Salud',
  trabajo:            'Trabajo',
  familiar:           'Familiar',
  cambio_carrera:     'Cambio de carrera',
  cambio_institucion: 'Cambio de institución',
  otro:               'Otro',
}

export default function BajasAdminPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [filtroEstatus, setFiltroEstatus] = useState('pendiente')
  const [filtroBaja, setFiltroBaja] = useState('')
  const [accionId, setAccionId] = useState<string | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [pendienteAccion, setPendienteAccion] = useState<{ id: string; estatus: EstatusBaja } | null>(null)

  const esJefeCarrera = user?.roles.includes('jefe_carrera') && !user?.roles.some(r => ['superadmin', 'admin'].includes(r))

  const { data, isLoading } = useQuery({
    queryKey: ['bajas-admin', filtroEstatus, filtroBaja],
    queryFn: () => permanenciaApi.getBajas({
      ...(filtroEstatus && { estatus: filtroEstatus }),
      ...(filtroBaja && { tipo_baja: filtroBaja }),
    }),
  })

  const actualizarMut = useMutation({
    mutationFn: ({ id, estatus, motivo }: { id: string; estatus: EstatusBaja; motivo?: string }) =>
      permanenciaApi.actualizarEstatusBaja(id, estatus, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bajas-admin'] })
      setAccionId(null)
      setPendienteAccion(null)
      setMotivoRechazo('')
    },
  })

  const lista: Baja[] = Array.isArray(data) ? data : data?.data ?? []

  function iniciarAccion(id: string, estatus: EstatusBaja) {
    if (estatus === 'rechazada') {
      setAccionId(id)
      setMotivoRechazo('')
    } else {
      setPendienteAccion({ id, estatus })
    }
  }

  function confirmarAccion() {
    if (!pendienteAccion) return
    actualizarMut.mutate({ id: pendienteAccion.id, estatus: pendienteAccion.estatus })
  }

  function confirmarRechazo(id: string) {
    actualizarMut.mutate({ id, estatus: 'rechazada', motivo: motivoRechazo })
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gestión de Bajas</h1>
        <p className="text-sm text-slate-500 mt-1">
          {esJefeCarrera
            ? 'Bajas de alumnos de tu carrera'
            : 'Solicitudes de baja temporal y definitiva de todos los alumnos'}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {(['', 'pendiente', 'aprobada', 'rechazada'] as const).map(e => (
            <button
              key={e}
              onClick={() => setFiltroEstatus(e)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filtroEstatus === e
                  ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {e === '' ? 'Todas' : e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['', 'temporal', 'definitiva'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFiltroBaja(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filtroBaja === t
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {t === '' ? 'Todo tipo' : TIPO_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Confirmación aprobar */}
      {pendienteAccion && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-800 mb-3">
            ¿Aprobar esta baja? El estatus del alumno cambiará automáticamente.
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmarAccion}
              disabled={actualizarMut.isPending}
              className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg disabled:opacity-50 hover:bg-green-700"
            >
              {actualizarMut.isPending ? 'Procesando…' : 'Confirmar aprobación'}
            </button>
            <button
              onClick={() => setPendienteAccion(null)}
              className="px-4 py-1.5 border border-slate-300 text-slate-600 text-sm rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Cargando solicitudes…</div>
      ) : lista.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl py-12 text-center text-slate-400 text-sm">
          No hay solicitudes con los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((baja) => (
            <div key={baja.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">
                      {baja.alumno?.user?.name ?? baja.alumno_id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {baja.alumno?.numero_control}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_BADGE[baja.estatus]}`}>
                      {baja.estatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {TIPO_LABEL[baja.tipo_baja]} · {baja.alumno?.carrera?.nombre} · {baja.alumno?.semestre_actual}° sem.
                  </p>
                  {baja.motivo_enum && (
                    <p className="text-xs text-slate-500 mt-1">
                      Motivo: {MOTIVO_LABEL[baja.motivo_enum] ?? baja.motivo_enum}
                      {baja.motivo_texto ? ` — ${baja.motivo_texto}` : ''}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    Solicitada: {new Date(baja.fecha_solicitud).toLocaleDateString('es-MX')}
                  </p>
                  {baja.motivo_rechazo && (
                    <p className="text-xs text-red-600 mt-1">Rechazo: {baja.motivo_rechazo}</p>
                  )}
                </div>

                {baja.estatus === 'pendiente' && (
                  <div className="shrink-0 flex flex-col gap-1.5">
                    {accionId === baja.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={motivoRechazo}
                          onChange={e => setMotivoRechazo(e.target.value)}
                          placeholder="Motivo del rechazo (requerido)"
                          rows={2}
                          className="w-48 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-300"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => confirmarRechazo(baja.id)}
                            disabled={!motivoRechazo.trim() || actualizarMut.isPending}
                            className="flex-1 px-2 py-1 bg-red-600 text-white text-xs rounded-lg disabled:opacity-50"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => setAccionId(null)}
                            className="px-2 py-1 border border-slate-300 text-slate-600 text-xs rounded-lg"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => iniciarAccion(baja.id, 'aprobada')}
                          className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => iniciarAccion(baja.id, 'rechazada')}
                          className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Rechazar
                        </button>
                      </>
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
