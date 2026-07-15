import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'
import apiClient from '../../../config/apiClient'
import { inputCls, selectCls, mutationError, ModalWrap } from '../../academico/pages/tabs/shared'

interface EvidenciaCalidad {
  id: string
  proceso: string
  descripcion: string
  archivo_url?: string
  tipo_evidencia?: string
  validada: boolean
  created_at: string
  registradoPor?: { name: string }
}

interface NoConformidad {
  id: string
  folio: string
  descripcion: string
  proceso: string
  detectada_por?: string
  estatus: string
  acciones?: AccionCorrectiva[]
  created_at: string
}

interface AccionCorrectiva {
  id: string
  descripcion: string
  responsable?: string
  fecha_limite?: string
  completada: boolean
}

interface Indicadores {
  total_evidencias: number
  evidencias_validadas: number
  no_conformidades_abiertas: number
  no_conformidades_cerradas: number
  acciones_pendientes: number
  acciones_completadas: number
}

interface Periodo { id: string; nombre: string }

export default function CalidadPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const isDirector = user?.roles?.some((r: string) => ['superadmin', 'admin', 'director_academico', 'direccion_academica'].includes(r))

  const [tab, setTab] = useState<'evidencias' | 'nc' | 'indicadores'>('evidencias')
  const [periodoId, setPeriodoId] = useState('')
  const [showEvidenciaModal, setShowEvidenciaModal] = useState(false)
  const [showNcModal, setShowNcModal] = useState(false)
  const [accionModal, setAccionModal] = useState<NoConformidad | null>(null)

  const [evidenciaForm, setEvidenciaForm] = useState({ proceso: '', descripcion: '', tipo_evidencia: '' })
  const [ncForm, setNcForm] = useState({ proceso: '', descripcion: '', detectada_por: '' })
  const [accionForm, setAccionForm] = useState({ descripcion: '', responsable: '', fecha_limite: '' })

  const { data: periodos = [] } = useQuery<Periodo[]>({
    queryKey: ['periodos-lista'],
    queryFn: () => apiClient.get('/periodos').then(r => r.data.data ?? []),
  })

  const { data: evidencias } = useQuery<{ data: EvidenciaCalidad[] }>({
    queryKey: ['evidencias-calidad'],
    queryFn: () => apiClient.get('/evidencias-calidad').then(r => r.data),
    enabled: tab === 'evidencias',
  })

  const { data: noConformidades } = useQuery<{ data: NoConformidad[] }>({
    queryKey: ['no-conformidades'],
    queryFn: () => apiClient.get('/no-conformidades').then(r => r.data),
    enabled: tab === 'nc',
  })

  const { data: indicadores } = useQuery<Indicadores>({
    queryKey: ['indicadores-calidad', periodoId],
    queryFn: () => apiClient.get(`/indicadores/calidad/${periodoId}`).then(r => r.data.data),
    enabled: tab === 'indicadores' && !!periodoId,
  })

  const mutCrearEvidencia = useMutation({
    mutationFn: () => apiClient.post('/evidencias-calidad', evidenciaForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evidencias-calidad'] })
      setShowEvidenciaModal(false)
      toastSuccess('Evidencia registrada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutValidarEvidencia = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/evidencias-calidad/${id}/validar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evidencias-calidad'] })
      toastSuccess('Evidencia validada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutCrearNc = useMutation({
    mutationFn: () => apiClient.post('/no-conformidades', ncForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['no-conformidades'] })
      setShowNcModal(false)
      toastSuccess('No conformidad creada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutAgregarAccion = useMutation({
    mutationFn: (ncId: string) => apiClient.post(`/no-conformidades/${ncId}/acciones`, accionForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['no-conformidades'] })
      setAccionModal(null)
      toastSuccess('Acción correctiva agregada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutCerrarNc = useMutation({
    mutationFn: (ncId: string) => apiClient.patch(`/no-conformidades/${ncId}/cerrar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['no-conformidades'] })
      toastSuccess('No conformidad cerrada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Acreditación y Calidad ISO/CACEI</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestión de evidencias, no conformidades y acciones correctivas</p>
      </div>

      <div className="flex gap-1 bg-white border border-slate-200 rounded-lg overflow-hidden w-fit">
        {[
          { key: 'evidencias', label: 'Evidencias' },
          { key: 'nc', label: 'No conformidades' },
          { key: 'indicadores', label: 'Indicadores' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 text-sm font-medium ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Evidencias */}
      {tab === 'evidencias' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => { setEvidenciaForm({ proceso: '', descripcion: '', tipo_evidencia: '' }); setShowEvidenciaModal(true) }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              + Registrar evidencia
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Proceso</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Descripción</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Validada</th>
                  {isDirector && <th />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(evidencias?.data ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">Sin evidencias registradas</td></tr>
                ) : (evidencias?.data ?? []).map(ev => (
                  <tr key={ev.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">{ev.proceso}</td>
                    <td className="px-4 py-3 text-slate-600 line-clamp-1 max-w-xs">{ev.descripcion}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{ev.tipo_evidencia ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ev.validada ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {ev.validada ? 'Sí' : 'Pendiente'}
                      </span>
                    </td>
                    {isDirector && (
                      <td className="px-4 py-3 text-right">
                        {!ev.validada && (
                          <button onClick={() => mutValidarEvidencia.mutate(ev.id)} className="text-xs text-blue-600 hover:underline">
                            Validar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* No conformidades */}
      {tab === 'nc' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => { setNcForm({ proceso: '', descripcion: '', detectada_por: '' }); setShowNcModal(true) }}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
            >
              + Nueva no conformidad
            </button>
          </div>

          <div className="space-y-3">
            {(noConformidades?.data ?? []).length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">Sin no conformidades registradas</div>
            )}

            {(noConformidades?.data ?? []).map(nc => (
              <div key={nc.id} className="bg-white rounded-xl border border-slate-200">
                <div className="px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{nc.folio}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${nc.estatus === 'abierta' ? 'bg-red-100 text-red-700' : nc.estatus === 'en_proceso' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {nc.estatus}
                      </span>
                    </div>
                    <p className="font-medium text-slate-800 mt-0.5">{nc.descripcion}</p>
                    <p className="text-xs text-slate-400">Proceso: {nc.proceso}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAccionModal(nc); setAccionForm({ descripcion: '', responsable: '', fecha_limite: '' }) }}
                      className="text-xs text-blue-600 hover:underline"
                    >+ Acción</button>
                    {nc.estatus !== 'cerrada' && (
                      <button onClick={() => mutCerrarNc.mutate(nc.id)} className="text-xs text-slate-500 hover:underline">Cerrar</button>
                    )}
                  </div>
                </div>

                {(nc.acciones ?? []).length > 0 && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Acciones correctivas</p>
                    <div className="space-y-1.5">
                      {nc.acciones!.map(a => (
                        <div key={a.id} className="flex items-start gap-2 text-xs">
                          <span className={`mt-0.5 w-3 h-3 rounded-full border-2 flex-shrink-0 ${a.completada ? 'bg-green-500 border-green-500' : 'border-slate-300'}`} />
                          <div>
                            <p className="text-slate-700">{a.descripcion}</p>
                            {a.responsable && <p className="text-slate-400">{a.responsable} {a.fecha_limite && `· ${a.fecha_limite}`}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Indicadores */}
      {tab === 'indicadores' && (
        <>
          <div className="flex gap-3">
            <select value={periodoId} onChange={e => setPeriodoId(e.target.value)} className={`${selectCls} max-w-xs`}>
              <option value="">Seleccionar periodo…</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          {periodoId && !indicadores && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">Cargando…</div>
          )}

          {indicadores && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Total evidencias',     value: indicadores.total_evidencias,         color: 'text-slate-700' },
                { label: 'Evidencias validadas', value: indicadores.evidencias_validadas,      color: 'text-green-700' },
                { label: 'NC abiertas',          value: indicadores.no_conformidades_abiertas, color: 'text-red-700' },
                { label: 'NC cerradas',          value: indicadores.no_conformidades_cerradas, color: 'text-green-700' },
                { label: 'Acciones pendientes',  value: indicadores.acciones_pendientes,       color: 'text-amber-700' },
                { label: 'Acciones completadas', value: indicadores.acciones_completadas,      color: 'text-blue-700' },
              ].map(item => (
                <div key={item.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal evidencia */}
      {showEvidenciaModal && (
        <ModalWrap title="Registrar evidencia de calidad" onClose={() => setShowEvidenciaModal(false)} onSave={() => mutCrearEvidencia.mutate()} saving={mutCrearEvidencia.isPending}>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Proceso *</label>
            <input value={evidenciaForm.proceso} onChange={e => setEvidenciaForm(f => ({ ...f, proceso: e.target.value }))} className={inputCls} placeholder="Ej. Diseño curricular" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo de evidencia</label>
            <select value={evidenciaForm.tipo_evidencia} onChange={e => setEvidenciaForm(f => ({ ...f, tipo_evidencia: e.target.value }))} className={selectCls}>
              <option value="">Seleccionar…</option>
              <option value="documental">Documental</option>
              <option value="fotografica">Fotográfica</option>
              <option value="estadistica">Estadística</option>
              <option value="audio_visual">Audio visual</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Descripción *</label>
            <textarea
              value={evidenciaForm.descripcion}
              onChange={e => setEvidenciaForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={3}
              className={inputCls}
            />
          </div>
        </ModalWrap>
      )}

      {/* Modal NC */}
      {showNcModal && (
        <ModalWrap title="Nueva no conformidad" onClose={() => setShowNcModal(false)} onSave={() => mutCrearNc.mutate()} saving={mutCrearNc.isPending}>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Proceso *</label>
            <input value={ncForm.proceso} onChange={e => setNcForm(f => ({ ...f, proceso: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Detectada por</label>
            <input value={ncForm.detectada_por} onChange={e => setNcForm(f => ({ ...f, detectada_por: e.target.value }))} className={inputCls} placeholder="Nombre del evaluador" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Descripción *</label>
            <textarea value={ncForm.descripcion} onChange={e => setNcForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} className={inputCls} />
          </div>
        </ModalWrap>
      )}

      {/* Modal acción correctiva */}
      {accionModal && (
        <ModalWrap title="Agregar acción correctiva" onClose={() => setAccionModal(null)} onSave={() => mutAgregarAccion.mutate(accionModal.id)} saving={mutAgregarAccion.isPending}>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Descripción de la acción *</label>
            <textarea value={accionForm.descripcion} onChange={e => setAccionForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Responsable</label>
            <input value={accionForm.responsable} onChange={e => setAccionForm(f => ({ ...f, responsable: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha límite</label>
            <input type="date" value={accionForm.fecha_limite} onChange={e => setAccionForm(f => ({ ...f, fecha_limite: e.target.value }))} className={inputCls} />
          </div>
        </ModalWrap>
      )}
    </div>
  )
}
