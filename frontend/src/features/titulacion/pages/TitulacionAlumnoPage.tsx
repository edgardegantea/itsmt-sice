import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authStore'
import { titulacionApi, type CertificadoIdioma, type SolicitudActoProtocolario, type SalidaLateral } from '../services/titulacion'

const ESTATUS_COLOR: Record<string, string> = {
  pendiente_revision:     'bg-yellow-100 text-yellow-800',
  no_procede:             'bg-red-100 text-red-800',
  con_no_inconveniencia:  'bg-blue-100 text-blue-800',
  agendado:               'bg-indigo-100 text-indigo-800',
  aprobado:               'bg-green-100 text-green-800',
  reprobado:              'bg-red-200 text-red-900',
  exento:                 'bg-purple-100 text-purple-800',
  solicitado:             'bg-blue-100 text-blue-800',
  en_revision:            'bg-yellow-100 text-yellow-800',
  rechazado:              'bg-red-100 text-red-800',
}

function Badge({ estatus }: { estatus: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
      {estatus.replace(/_/g, ' ')}
    </span>
  )
}

type Tab = 'certificado' | 'acto' | 'salida'

export default function TitulacionAlumnoPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const alumnoId = user?.alumno_id
  const [tab, setTab] = useState<Tab>('certificado')

  // Certificados de idioma
  const { data: certData } = useQuery({
    queryKey: ['mi-cert-idioma', alumnoId],
    queryFn:  () => titulacionApi.getCertificadosIdioma({ alumno_id: alumnoId! }),
    enabled:  !!alumnoId,
  })

  // Solicitudes Acto Protocolario
  const { data: solicitudesData } = useQuery({
    queryKey: ['mis-solicitudes-acto', alumnoId],
    queryFn:  () => titulacionApi.getSolicitudesActo({ alumno_id: alumnoId! }),
    enabled:  !!alumnoId && tab === 'acto',
  })

  // Salida Lateral
  const { data: salidaData } = useQuery({
    queryKey: ['mi-salida-lateral', alumnoId],
    queryFn:  () => titulacionApi.getSalidaLateral(),
    enabled:  !!alumnoId && tab === 'salida',
  })

  // Forms
  const [certForm, setCertForm] = useState({
    idioma: 'Inglés',
    nivel: 'B1',
    institucion_certificadora: '',
    fecha_expedicion: '',
    url_documento: '',
  })
  const [certError, setCertError] = useState('')

  const mutCert = useMutation({
    mutationFn: () => titulacionApi.registrarCertificadoIdioma({
      idioma:                   certForm.idioma,
      nivel:                    certForm.nivel,
      institucion_certificadora:certForm.institucion_certificadora,
      fecha_expedicion:         certForm.fecha_expedicion,
      url_documento:            certForm.url_documento || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mi-cert-idioma'] })
      setCertError('')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setCertError(msg ?? 'Error al registrar certificado.')
    },
  })

  const certificados: CertificadoIdioma[] = certData?.data ?? certData ?? []
  const solicitudes: SolicitudActoProtocolario[] = solicitudesData?.data ?? solicitudesData ?? []
  const salidasLaterales: SalidaLateral[] = salidaData?.data ?? salidaData ?? []
  const miCert = certificados[0] ?? null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'certificado', label: 'Certificado de Idioma' },
    { id: 'acto', label: 'Acto Protocolario' },
    { id: 'salida', label: 'Salida Lateral' },
  ]

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Titulación</h1>
        <p className="text-sm text-slate-500 mt-0.5">Acto Protocolario para la Titulación Integral — TecNM-AC-PO-006.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-4">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Certificado de idioma ── */}
      {tab === 'certificado' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Debes contar con un certificado de lengua extranjera en nivel <strong>B1 MCER o superior</strong> validado por la institución como prerequisito de titulación (Cap. 14.4.1.2).
          </p>

          {miCert ? (
            <div className="border border-slate-200 rounded-lg p-5 bg-white shadow-sm space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{miCert.idioma} — {miCert.nivel}</p>
                  <p className="text-sm text-slate-500">{miCert.institucion_certificadora}</p>
                  <p className="text-sm text-slate-500">Expedición: {miCert.fecha_expedicion}</p>
                </div>
                <Badge estatus={miCert.validado ? 'aprobado' : 'pendiente_revision'} />
              </div>
              {miCert.validado && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mt-2">
                  ✓ Certificado validado por la institución. Prerequisito de titulación cumplido.
                </p>
              )}
              {!miCert.validado && (
                <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mt-2">
                  Pendiente de validación por Servicios Escolares.
                </p>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg p-6 bg-white shadow-sm space-y-4">
              <h2 className="font-medium text-slate-700">Registrar certificado de idioma</h2>
              {certError && <p className="text-red-600 text-sm">{certError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Idioma</label>
                  <input className="w-full border rounded px-3 py-1.5 text-sm" value={certForm.idioma}
                    onChange={e => setCertForm(f => ({ ...f, idioma: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nivel MCER</label>
                  <select className="w-full border rounded px-3 py-1.5 text-sm" value={certForm.nivel}
                    onChange={e => setCertForm(f => ({ ...f, nivel: e.target.value }))}>
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Institución certificadora *</label>
                <input className="w-full border rounded px-3 py-1.5 text-sm" value={certForm.institucion_certificadora}
                  onChange={e => setCertForm(f => ({ ...f, institucion_certificadora: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de expedición *</label>
                <input type="date" className="w-full border rounded px-3 py-1.5 text-sm" value={certForm.fecha_expedicion}
                  onChange={e => setCertForm(f => ({ ...f, fecha_expedicion: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">URL del documento (opcional)</label>
                <input type="url" className="w-full border rounded px-3 py-1.5 text-sm" value={certForm.url_documento}
                  onChange={e => setCertForm(f => ({ ...f, url_documento: e.target.value }))} />
              </div>
              <button onClick={() => mutCert.mutate()}
                disabled={mutCert.isPending || !certForm.institucion_certificadora || !certForm.fecha_expedicion}
                className="px-4 py-2 rounded text-sm bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50">
                {mutCert.isPending ? 'Registrando…' : 'Registrar certificado'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Acto Protocolario ── */}
      {tab === 'acto' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
            <p className="font-medium">Prerequisitos para solicitar Acto Protocolario (política 3.3 PO-006):</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Todos los créditos de la carrera acreditados (100%)</li>
              <li>Certificado de lengua extranjera B1 MCER validado</li>
              <li>Servicio Social acreditado (liberación)</li>
            </ul>
          </div>

          {solicitudes.length > 0 ? (
            <div className="space-y-3">
              {solicitudes.map((s: SolicitudActoProtocolario) => (
                <div key={s.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">Opción {s.modalidad?.opcion_numero} — {s.modalidad?.nombre}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Enviada: {s.created_at?.slice(0, 10)}</p>
                      {s.retake_plazo_hasta && (
                        <p className="text-xs text-orange-600 mt-1">Plazo para nueva presentación: {s.retake_plazo_hasta}</p>
                      )}
                      {s.actoProtocolario && (
                        <p className="text-sm text-slate-600 mt-1">
                          Acto programado: <strong>{s.actoProtocolario.fecha}</strong> {s.actoProtocolario.hora} — {s.actoProtocolario.lugar}
                        </p>
                      )}
                    </div>
                    <Badge estatus={s.estatus} />
                  </div>
                  {s.motivo_improcedencia && (
                    <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-200 rounded px-3 py-2">
                      Motivo: {s.motivo_improcedencia}
                    </p>
                  )}
                  {(s.estatus === 'aprobado' || s.estatus === 'exento') && (
                    <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mt-2">
                      ✓ {s.estatus === 'exento' ? 'Exento de examen profesional' : 'Examen profesional aprobado'}. Proceso de titulación completado.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              No has enviado solicitud de Acto Protocolario. Contacta a Servicios Escolares para iniciar el proceso una vez que cumplas todos los prerequisitos.
            </p>
          )}
        </div>
      )}

      {/* ── Salida Lateral ── */}
      {tab === 'salida' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-1">
            <p className="font-medium">Salida Lateral</p>
            <p className="text-xs">Opción para alumnos con ≥60% de créditos aprobados que no desean continuar la carrera. Genera un Diploma firmado por el Director del Instituto.</p>
          </div>

          {salidasLaterales.length > 0 ? (
            <div className="space-y-3">
              {salidasLaterales.map((s: SalidaLateral) => (
                <div key={s.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">Solicitud de Salida Lateral</p>
                      <p className="text-sm text-slate-600">Créditos al solicitar: <strong>{s.porcentaje_creditos_al_solicitar}%</strong></p>
                      <p className="text-sm text-slate-600">Asignatura: <em>{s.asignaturaEspecialidad?.nombre ?? '—'}</em></p>
                      <p className="text-xs text-slate-400">Periodo: {s.periodoSolicitud?.nombre}</p>
                    </div>
                    <Badge estatus={s.estatus} />
                  </div>
                  {s.estatus === 'aprobado' && (
                    <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mt-2">
                      ✓ Solicitud aprobada. El diploma estará disponible en Servicios Escolares.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              No tienes solicitud de Salida Lateral. Contacta a Servicios Escolares si deseas iniciar este trámite.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
