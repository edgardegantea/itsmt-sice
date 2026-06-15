import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authStore'
import { permanenciaApi, type TipoConstancia } from '../services/permanencia'
import { admisionApi } from '../../admision/services/admision'

const TIPO_CONSTANCIA_LABEL: Record<TipoConstancia, string> = {
  estudios:      'Constancia de estudios',
  inscripcion:   'Constancia de inscripción',
  calificaciones:'Constancia de calificaciones',
}

const TIPO_CONSTANCIA_DESC: Record<TipoConstancia, string> = {
  estudios:      'Certifica que eres alumno activo en esta institución.',
  inscripcion:   'Confirma tu inscripción formal al periodo vigente.',
  calificaciones:'Detalla las calificaciones acreditadas hasta el semestre actual.',
}

const ESTATUS_COLOR: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobada:  'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
  solicitada:'bg-blue-100 text-blue-800',
  emitida:   'bg-green-100 text-green-800',
}

const ESTATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobada:  'Aprobada',
  rechazada: 'Rechazada',
  solicitada:'Solicitada',
  emitida:   'Emitida',
}

function Badge({ estatus }: { estatus: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
      {ESTATUS_LABEL[estatus] ?? estatus}
    </span>
  )
}

export default function TramitesAlumnoPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const alumnoId = (user as any)?.alumno_id as string | undefined

  const [tab, setTab] = useState<'reinscripcion' | 'constancias'>('reinscripcion')
  const [tipoConstancia, setTipoConstancia] = useState<TipoConstancia>('estudios')

  // Periodo activo
  const { data: periodo } = useQuery({
    queryKey: ['periodo-activo'],
    queryFn: () => import('../../admision/services/catalogo').then(m => m.catalogoPublico.getPeriodoActivo()),
  })

  // Reinscripción del alumno en el periodo activo
  const { data: reinscripciones } = useQuery({
    queryKey: ['mis-reinscripciones'],
    queryFn: () => permanenciaApi.getReinscripciones(),
    enabled: !!alumnoId,
  })

  const reinscripcionActual = reinscripciones?.data?.find(
    (r: any) => r.periodo_id === periodo?.id && r.alumno?.user_id === user?.id
  )

  // Adeudos
  const { data: adeudos = [] } = useQuery({
    queryKey: ['adeudos', alumnoId],
    queryFn: () => permanenciaApi.getAdeudos(alumnoId!),
    enabled: !!alumnoId,
  })

  // Constancias
  const { data: constancias = [] } = useQuery({
    queryKey: ['mis-constancias', alumnoId],
    queryFn: () => permanenciaApi.getConstanciasAlumno(alumnoId!),
    enabled: !!alumnoId,
  })

  // Mutaciones
  const mutSolicitar = useMutation({
    mutationFn: () => permanenciaApi.solicitarReinscripcion(periodo!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mis-reinscripciones'] }),
  })

  const mutConstancia = useMutation({
    mutationFn: (tipo: TipoConstancia) => permanenciaApi.solicitarConstancia(tipo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mis-constancias', alumnoId] }),
  })

  const tieneAdeudos = adeudos.length > 0
  const puedeReinscribirse = !tieneAdeudos && !reinscripcionActual && !!periodo

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Trámites escolares</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestiona tus solicitudes de reinscripción y constancias.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['reinscripcion', 'constancias'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t ? 'border-[#1a3a5c] text-[#1a3a5c]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'reinscripcion' ? 'Reinscripción' : 'Constancias'}
          </button>
        ))}
      </div>

      {/* ── Reinscripción ── */}
      {tab === 'reinscripcion' && (
        <div className="space-y-5">
          {tieneAdeudos && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
              <p className="text-sm font-semibold text-red-800 mb-1">Tienes adeudos pendientes</p>
              <ul className="space-y-1 mt-2">
                {adeudos.map((a: any) => (
                  <li key={a.id} className="text-xs text-red-700 flex justify-between">
                    <span>{a.concepto}</span>
                    <span className="font-semibold">${parseFloat(a.monto).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-red-600 mt-3">Liquida tus adeudos en Caja antes de solicitar la reinscripción.</p>
            </div>
          )}

          {reinscripcionActual ? (
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Solicitud de reinscripción</p>
                <Badge estatus={reinscripcionActual.estatus} />
              </div>
              <p className="text-xs text-slate-500">Periodo: <span className="font-medium text-slate-700">{reinscripcionActual.periodo?.nombre}</span></p>
              {reinscripcionActual.observaciones && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-xs text-yellow-800">
                  {reinscripcionActual.observaciones}
                </div>
              )}
              {reinscripcionActual.estatus === 'aprobada' && !reinscripcionActual.resello_registrado && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800">
                  Tu reinscripción fue aprobada. Preséntate en Control Escolar para el resello de tu credencial.
                </div>
              )}
              {reinscripcionActual.resello_registrado && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-800">
                  Reinscripción completa — credencial resellada el {reinscripcionActual.fecha_resello}.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">Solicitar reinscripción</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Periodo: <span className="font-medium">{periodo?.nombre ?? 'Cargando…'}</span>
                </p>
              </div>
              {!periodo && (
                <p className="text-xs text-slate-400">No hay periodo activo disponible.</p>
              )}
              {mutSolicitar.isSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-800">
                  Solicitud enviada. Control Escolar la revisará a la brevedad.
                </div>
              )}
              {mutSolicitar.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
                  {(mutSolicitar.error as any)?.response?.data?.message ?? 'Error al solicitar reinscripción.'}
                </div>
              )}
              <button
                disabled={!puedeReinscribirse || mutSolicitar.isPending}
                onClick={() => mutSolicitar.mutate()}
                className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primario)' }}
              >
                {mutSolicitar.isPending ? 'Enviando…' : 'Solicitar reinscripción'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Constancias ── */}
      {tab === 'constancias' && (
        <div className="space-y-5">
          {/* Solicitar nueva */}
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-5 space-y-4">
            <p className="text-sm font-semibold text-slate-700">Solicitar constancia</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.keys(TIPO_CONSTANCIA_LABEL) as TipoConstancia[]).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => setTipoConstancia(tipo)}
                  className={`rounded-xl border-2 px-4 py-3 text-left transition ${
                    tipoConstancia === tipo
                      ? 'border-[#1a3a5c] bg-[#1a3a5c]/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-medium text-slate-800">{TIPO_CONSTANCIA_LABEL[tipo]}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{TIPO_CONSTANCIA_DESC[tipo]}</p>
                </button>
              ))}
            </div>
            {mutConstancia.isSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-800">
                Solicitud registrada. Control Escolar emitirá tu constancia y podrás descargarla aquí.
              </div>
            )}
            <button
              disabled={mutConstancia.isPending}
              onClick={() => mutConstancia.mutate(tipoConstancia)}
              className="px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primario)' }}
            >
              {mutConstancia.isPending ? 'Solicitando…' : `Solicitar ${TIPO_CONSTANCIA_LABEL[tipoConstancia]}`}
            </button>
          </div>

          {/* Historial */}
          {constancias.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {constancias.map((c: any) => (
                <div key={c.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{TIPO_CONSTANCIA_LABEL[c.tipo as TipoConstancia]}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{c.folio_unico}</p>
                  </div>
                  <Badge estatus={c.estatus} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
