import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authStore'
import { permanenciaApi, type TipoConstancia, type Baja, type Reinscripcion } from '../services/permanencia'
import { mutationError } from '../../academico/pages/tabs/shared'
import { useConstanciaPdf } from '../hooks/useConstanciaPdf'

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
  const alumnoId = user?.alumno_id

  const [tab, setTab] = useState<'reinscripcion' | 'constancias' | 'baja'>('reinscripcion')
  const [tipoConstancia, setTipoConstancia] = useState<TipoConstancia>('estudios')

  const { descargar: descargarConstancia, generando: generandoConstancia } = useConstanciaPdf()

  // Periodo activo
  const { data: periodo } = useQuery({
    queryKey: ['periodo-activo'],
    queryFn: () => import('../../admision/services/admision').then(m => m.admisionApi.getPeriodoActivo()),
  })

  // Reinscripciones del alumno (el backend ya scopea por alumno_id cuando rol=alumno)
  const { data: reinscripciones } = useQuery({
    queryKey: ['mis-reinscripciones'],
    queryFn: () => permanenciaApi.getReinscripciones(),
    enabled: !!alumnoId,
  })

  const reinscripcionActual = ((reinscripciones?.data ?? reinscripciones) as Reinscripcion[] | undefined)?.find(
    r => r.periodo_id === periodo?.id
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

  // Bajas del alumno
  const { data: misBajas = [] } = useQuery({
    queryKey: ['mis-bajas'],
    queryFn: () => permanenciaApi.getMisBajas(),
    enabled: !!alumnoId,
  })

  const [bajaMotivo, setBajaMotivo] = useState('')
  const [bajaSemestres, setBajaSemestres] = useState('')

  const mutBaja = useMutation({
    mutationFn: () => permanenciaApi.solicitarBajaTemporal({
      periodo_id:                 periodo!.id,
      fecha_solicitud:            new Date().toISOString().split('T')[0],
      motivo_texto:               bajaMotivo || undefined,
      numero_semestres_cursados:  bajaSemestres ? parseInt(bajaSemestres) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-bajas'] })
      qc.invalidateQueries({ queryKey: ['mis-reinscripciones'] })
    },
  })

  const bajaActual = (misBajas as Baja[]).find(b => b.periodo_id === periodo?.id)

  const tieneAdeudos = adeudos.length > 0
  const pendienteCertificado = !!user?.pendiente_certificado_bachillerato
  const puedeReinscribirse = !tieneAdeudos && !pendienteCertificado && !reinscripcionActual && !!periodo

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Trámites escolares</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestiona tus solicitudes de reinscripción y constancias.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['reinscripcion', 'constancias', 'baja'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t ? 'border-[#1a3a5c] text-[#1a3a5c]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'reinscripcion' ? 'Reinscripción' : t === 'constancias' ? 'Constancias' : 'Baja temporal'}
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
                {adeudos.map((a) => (
                  <li key={a.id} className="text-xs text-red-700 flex justify-between">
                    <span>{a.concepto}</span>
                    <span className="font-semibold">${parseFloat(a.monto).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-red-600 mt-3">Liquida tus adeudos en Caja antes de solicitar la reinscripción.</p>
            </div>
          )}

          {pendienteCertificado && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">Certificado de bachillerato pendiente</p>
              <p className="text-xs text-amber-700">
                No puedes solicitar reinscripción hasta entregar tu certificado de bachillerato en Control Escolar
                (TecNM-AC-PO-001-05). Una vez entregado, el personal actualizará tu expediente.
              </p>
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
                  Reinscripción completa — credencial resellada el {reinscripcionActual.fecha_resello ? new Date(reinscripcionActual.fecha_resello + 'T12:00:00').toLocaleDateString('es-MX') : ''}.
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
                  {mutationError(mutSolicitar.error)}
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

      {/* ── Baja temporal ── */}
      {tab === 'baja' && (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">Baja temporal (TecNM-AC-PO-002)</p>
            <p className="text-xs text-amber-700">
              Puedes solicitar baja temporal únicamente antes del plazo establecido por Control Escolar. Esta acción suspende tu inscripción en el periodo activo.
            </p>
          </div>

          {bajaActual ? (
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Baja registrada en este periodo</p>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{bajaActual.tipo_baja}</span>
              </div>
              <p className="text-xs text-slate-500">Periodo: <span className="font-medium text-slate-700">{bajaActual.periodo?.nombre}</span></p>
              <p className="text-xs text-slate-500">Fecha de solicitud: <span className="font-medium text-slate-700">{new Date(bajaActual.fecha_solicitud).toLocaleDateString('es-MX')}</span></p>
              {bajaActual.reingreso_posible && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800">
                  Tu baja tiene posibilidad de reingreso. Consulta con Control Escolar los requisitos para el periodo siguiente.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">Solicitar baja temporal</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Periodo: <span className="font-medium">{periodo?.nombre ?? 'Cargando…'}</span>
                </p>
              </div>
              {!periodo && (
                <p className="text-xs text-slate-400">No hay periodo activo disponible.</p>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Semestres cursados</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={bajaSemestres}
                  onChange={e => setBajaSemestres(e.target.value)}
                  placeholder="Número de semestres cursados"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Motivo (opcional)</label>
                <textarea
                  rows={3}
                  value={bajaMotivo}
                  onChange={e => setBajaMotivo(e.target.value)}
                  placeholder="Describe brevemente el motivo de tu baja temporal…"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 resize-none"
                />
              </div>
              {mutBaja.isSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-800">
                  Baja temporal registrada. Acude a Control Escolar para completar el trámite.
                </div>
              )}
              {mutBaja.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
                  {mutationError(mutBaja.error)}
                </div>
              )}
              <button
                disabled={!periodo || mutBaja.isPending || mutBaja.isSuccess}
                onClick={() => mutBaja.mutate()}
                className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primario)' }}
              >
                {mutBaja.isPending ? 'Procesando…' : 'Solicitar baja temporal'}
              </button>
            </div>
          )}

          {/* Historial */}
          {(misBajas as Baja[]).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <p className="px-5 pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Historial de bajas</p>
              <div className="divide-y divide-slate-100">
                {(misBajas as Baja[]).map(b => (
                  <div key={b.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-800 capitalize">{b.tipo_baja}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{b.periodo?.nombre ?? '—'}</p>
                      {b.motivo_texto && <p className="text-xs text-slate-500 mt-1">{b.motivo_texto}</p>}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{new Date(b.fecha_solicitud).toLocaleDateString('es-MX')}</span>
                  </div>
                ))}
              </div>
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
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <p className="px-5 pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mis solicitudes</p>
              <div className="divide-y divide-slate-100">
                {constancias.map((c) => (
                  <div key={c.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{TIPO_CONSTANCIA_LABEL[c.tipo as TipoConstancia]}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">{c.folio_unico}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge estatus={c.estatus} />
                      {c.estatus === 'emitida' && (
                        <button
                          onClick={() => descargarConstancia(c)}
                          disabled={generandoConstancia === c.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
                          style={{ backgroundColor: 'var(--color-primario)' }}
                        >
                          {generandoConstancia === c.id ? 'Generando…' : 'Descargar PDF'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
