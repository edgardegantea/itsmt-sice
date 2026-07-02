import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authStore'
import { vinculacionApi, type ServicioSocial, type SolicitudRp, type PrerequisitosRp } from '../services/vinculacion'

const ESTATUS_COLOR: Record<string, string> = {
  solicitado:             'bg-blue-100 text-blue-800',
  aprobado:               'bg-indigo-100 text-indigo-800',
  rechazado:              'bg-red-100 text-red-800',
  en_curso:               'bg-yellow-100 text-yellow-800',
  acreditado:             'bg-green-100 text-green-800',
  pendiente_dictamen:     'bg-yellow-100 text-yellow-800',
  con_dictamen_aceptado:  'bg-green-100 text-green-800',
  con_dictamen_rechazado: 'bg-red-100 text-red-800',
}

function Badge({ estatus }: { estatus: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
      {estatus.replace(/_/g, ' ')}
    </span>
  )
}

type Tab = 'ss' | 'rp'

function PrerequisiteRow({
  label, description, met, loading, detail, highlight,
}: {
  label: string
  description: string
  met: boolean | undefined
  loading: boolean
  detail?: string
  highlight?: string
}) {
  return (
    <li className="flex items-start gap-4 px-5 py-4">
      {/* Icono de estado */}
      <div className="mt-0.5 shrink-0">
        {loading ? (
          <div className="w-6 h-6 rounded-full bg-slate-100 animate-pulse" />
        ) : met ? (
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${loading ? 'text-slate-400' : met ? 'text-slate-800' : 'text-slate-800'}`}>
          {label}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        {detail && (
          <p className={`text-xs mt-1 font-medium ${met ? 'text-green-700' : 'text-slate-600'}`}>
            {detail}
          </p>
        )}
        {highlight && (
          <p className="text-xs mt-1 text-amber-700 bg-amber-50 rounded px-2 py-0.5 inline-block">
            {highlight}
          </p>
        )}
      </div>

      {/* Badge derecho */}
      <div className="shrink-0">
        {!loading && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            met ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {met ? 'Cumplido' : 'Pendiente'}
          </span>
        )}
      </div>
    </li>
  )
}

export default function VinculacionAlumnoPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const alumnoId = user?.alumno_id
  const [tab, setTab] = useState<Tab>('ss')

  // Servicio Social
  const { data: ssData } = useQuery({
    queryKey: ['mi-ss', alumnoId],
    queryFn:  () => vinculacionApi.getServicioSocial({ alumno_id: alumnoId! }),
    enabled:  !!alumnoId,
  })

  // Prerrequisitos RP
  const { data: prereqs } = useQuery<PrerequisitosRp>({
    queryKey: ['prereqs-rp', alumnoId],
    queryFn:  () => vinculacionApi.verificarPrerequisitosRp(alumnoId!),
    enabled:  !!alumnoId,
  })

  // Solicitudes RP
  const { data: rpData } = useQuery({
    queryKey: ['mis-solicitudes-rp', alumnoId],
    queryFn:  () => vinculacionApi.getSolicitudesRp({ alumno_id: alumnoId! }),
    enabled:  !!alumnoId && tab === 'rp',
  })

  // Forms
  const [ssForm, setSsForm] = useState({ empresa: '', responsable: '', fecha_inicio: '' })
  const [rpForm, setRpForm] = useState({
    opcion: 'propuesta_propia' as 'banco_proyectos' | 'propuesta_propia' | 'trabajador',
    nombre_empresa: '',
    numero_seguro_social: '',
    tipo_seguro: 'imss' as 'imss' | 'issste',
    periodo_proyectado: '',
  })
  const [error, setError] = useState('')
  const [rpError, setRpError] = useState('')

  const mutSS = useMutation({
    mutationFn: () => vinculacionApi.registrarServicioSocial({
      empresa:      ssForm.empresa,
      responsable:  ssForm.responsable || undefined,
      fecha_inicio: ssForm.fecha_inicio || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mi-ss', alumnoId] })
      qc.invalidateQueries({ queryKey: ['prereqs-rp', alumnoId] })
      setError('')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Error al registrar Servicio Social.')
    },
  })

  const mutRP = useMutation({
    mutationFn: () => vinculacionApi.crearSolicitudRp({
      opcion:        rpForm.opcion,
      datos_empresa: { nombre: rpForm.nombre_empresa },
      numero_seguro_social: rpForm.numero_seguro_social || undefined,
      tipo_seguro:   rpForm.tipo_seguro,
      periodo_proyectado: rpForm.periodo_proyectado || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-solicitudes-rp', alumnoId] })
      setRpError('')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setRpError(msg ?? 'Error al enviar solicitud.')
    },
  })

  const ssRegistros: ServicioSocial[] = ssData?.data ?? ssData ?? []
  const rpRegistros: SolicitudRp[]    = rpData?.data ?? rpData ?? []
  const miSS = ssRegistros[0] ?? null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'ss', label: 'Servicio Social' },
    { id: 'rp', label: 'Residencia Profesional' },
  ]

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Vinculación Institucional</h1>
        <p className="text-sm text-slate-500 mt-0.5">Trámites de Servicio Social y Residencia Profesional (TecNM-AC-PO-004).</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-4">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Servicio Social ── */}
      {tab === 'ss' && (
        <div className="space-y-6">
          {miSS ? (
            <div className="border border-slate-200 rounded-lg p-5 space-y-2 bg-white shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{miSS.empresa}</p>
                  {miSS.responsable && <p className="text-sm text-slate-500">Responsable: {miSS.responsable}</p>}
                  {miSS.fecha_inicio && <p className="text-sm text-slate-500">Inicio: {miSS.fecha_inicio}</p>}
                  {miSS.horas_acumuladas > 0 && (
                    <p className="text-sm text-slate-600 mt-1">Horas acumuladas: <strong>{miSS.horas_acumuladas}</strong></p>
                  )}
                </div>
                <Badge estatus={miSS.estatus} />
              </div>
              {miSS.estatus === 'acreditado' && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mt-2">
                  ✓ Servicio Social acreditado con {miSS.creditos_otorgados} créditos.
                </p>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg p-6 bg-white shadow-sm space-y-4">
              <h2 className="font-medium text-slate-700">Registrar Servicio Social</h2>
              <p className="text-sm text-slate-500">
                Requisito: tener al menos <strong>70% de créditos acreditados</strong>.
              </p>

              {prereqs && (
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={prereqs.porcentaje_creditos >= 70 ? 'text-green-600' : 'text-red-600'}>
                      {prereqs.porcentaje_creditos >= 70 ? '✓' : '✗'}
                    </span>
                    <span>Créditos: {prereqs.porcentaje_creditos}% ({prereqs.creditos_acreditados}/{prereqs.creditos_totales})</span>
                  </div>
                </div>
              )}

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Empresa / Organización *</label>
                  <input
                    className="w-full border rounded px-3 py-1.5 text-sm"
                    value={ssForm.empresa}
                    onChange={e => setSsForm(f => ({ ...f, empresa: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Responsable</label>
                  <input
                    className="w-full border rounded px-3 py-1.5 text-sm"
                    value={ssForm.responsable}
                    onChange={e => setSsForm(f => ({ ...f, responsable: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de inicio</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-1.5 text-sm"
                    value={ssForm.fecha_inicio}
                    onChange={e => setSsForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                  />
                </div>
              </div>

              <button
                onClick={() => mutSS.mutate()}
                disabled={mutSS.isPending || !ssForm.empresa}
                className="px-4 py-2 rounded text-sm bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
              >
                {mutSS.isPending ? 'Registrando…' : 'Registrar Servicio Social'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Residencia Profesional ── */}
      {tab === 'rp' && (
        <div className="space-y-6">

          {/* ── Checklist prerrequisitos — siempre visible ── */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Prerrequisitos para Residencia Profesional</h3>
              {prereqs && (
                prereqs.puede_solicitar_rp
                  ? <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">Listo para solicitar</span>
                  : <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">Pendientes</span>
              )}
            </div>

            <ul className="divide-y divide-slate-100">
              {/* Servicio Social */}
              <PrerequisiteRow
                label="Servicio Social acreditado"
                description="Debes haber completado y acreditado tu Servicio Social (mínimo 480 horas)."
                met={prereqs?.ss_acreditado}
                loading={!prereqs}
                detail={
                  prereqs && !prereqs.ss_acreditado
                    ? 'Ve a la pestaña "Servicio Social" para registrarlo.'
                    : undefined
                }
              />

              {/* Créditos */}
              <PrerequisiteRow
                label="Mínimo 80% de créditos acreditados"
                description="Necesitas haber acreditado al menos el 80% del total de créditos de tu carrera."
                met={prereqs ? prereqs.porcentaje_creditos >= 80 : undefined}
                loading={!prereqs}
                detail={
                  prereqs
                    ? `Tienes ${prereqs.porcentaje_creditos}% (${prereqs.creditos_acreditados} de ${prereqs.creditos_totales} créditos).`
                    : undefined
                }
                highlight={
                  prereqs && prereqs.porcentaje_creditos < 80
                    ? `Faltan ${Math.ceil(((80 - prereqs.porcentaje_creditos) / 100) * prereqs.creditos_totales)} créditos aproximadamente.`
                    : undefined
                }
              />

              {/* Actividades Complementarias */}
              <PrerequisiteRow
                label="Actividades Complementarias acreditadas"
                description="Debes tener al menos una Actividad Complementaria validada por la institución."
                met={prereqs?.ac_completadas}
                loading={!prereqs}
                detail={
                  prereqs && !prereqs.ac_completadas
                    ? 'Consulta a Control Escolar sobre las actividades disponibles.'
                    : undefined
                }
              />

              {/* Límite de semestres */}
              <PrerequisiteRow
                label="Dentro del límite de semestres"
                description="Debes estar cursando dentro de los 12 semestres reglamentarios."
                met={prereqs?.dentro_limite_semestres}
                loading={!prereqs}
                detail={
                  prereqs
                    ? `Semestre actual: ${prereqs.semestre_actual} de 12.`
                    : undefined
                }
              />
            </ul>
          </div>

          {/* Solicitudes existentes */}
          {rpRegistros.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-slate-700">Mis solicitudes</h3>
              {rpRegistros.map((rp: SolicitudRp) => (
                <div key={rp.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-800">{rp.datos_empresa?.nombre ?? '—'}</p>
                    <p className="text-xs text-slate-500 capitalize">{rp.opcion?.replace('_', ' ')}</p>
                    {rp.dictamen && (
                      <p className="text-xs mt-1">
                        Dictamen: <strong className={rp.dictamen.dictamen === 'aceptado' ? 'text-green-700' : 'text-red-700'}>
                          {rp.dictamen.dictamen}
                        </strong>
                      </p>
                    )}
                  </div>
                  <Badge estatus={rp.estatus} />
                </div>
              ))}
            </div>
          )}

          {/* Formulario nueva solicitud */}
          {prereqs?.puede_solicitar_rp && rpRegistros.length === 0 && (
            <div className="border border-slate-200 rounded-lg p-6 bg-white shadow-sm space-y-4">
              <h2 className="font-medium text-slate-700">Solicitar Residencia Profesional</h2>

              {rpError && <p className="text-red-600 text-sm">{rpError}</p>}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Opción *</label>
                  <select
                    className="w-full border rounded px-3 py-1.5 text-sm"
                    value={rpForm.opcion}
                    onChange={e => setRpForm(f => ({ ...f, opcion: e.target.value as typeof rpForm.opcion }))}
                  >
                    <option value="propuesta_propia">Propuesta propia</option>
                    <option value="banco_proyectos">Banco de proyectos institucionales</option>
                    <option value="trabajador">Trabajador en activo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nombre de la empresa *</label>
                  <input
                    className="w-full border rounded px-3 py-1.5 text-sm"
                    value={rpForm.nombre_empresa}
                    onChange={e => setRpForm(f => ({ ...f, nombre_empresa: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">No. Seguro Social</label>
                    <input
                      className="w-full border rounded px-3 py-1.5 text-sm"
                      value={rpForm.numero_seguro_social}
                      onChange={e => setRpForm(f => ({ ...f, numero_seguro_social: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de seguro</label>
                    <select
                      className="w-full border rounded px-3 py-1.5 text-sm"
                      value={rpForm.tipo_seguro}
                      onChange={e => setRpForm(f => ({ ...f, tipo_seguro: e.target.value as 'imss' | 'issste' }))}
                    >
                      <option value="imss">IMSS</option>
                      <option value="issste">ISSSTE</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Periodo proyectado (ej. Ene-Jun 2026)</label>
                  <input
                    className="w-full border rounded px-3 py-1.5 text-sm"
                    value={rpForm.periodo_proyectado}
                    onChange={e => setRpForm(f => ({ ...f, periodo_proyectado: e.target.value }))}
                  />
                </div>
              </div>

              <button
                onClick={() => mutRP.mutate()}
                disabled={mutRP.isPending || !rpForm.nombre_empresa}
                className="px-4 py-2 rounded text-sm bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
              >
                {mutRP.isPending ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
