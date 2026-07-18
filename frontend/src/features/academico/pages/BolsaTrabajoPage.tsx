import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'
import apiClient from '../../../config/apiClient'
import { inputCls, selectCls, mutationError, ModalWrap } from './tabs/shared'

interface Vacante {
  id: string
  empresa: string
  puesto: string
  descripcion?: string
  modalidad: string
  rango_salarial?: string
  contacto_email: string
  fecha_publicacion: string
  fecha_cierre?: string
  activa: boolean
  carrera?: { nombre: string }
  publicador?: { name: string }
}

interface Indicadores {
  total_egresados: number
  egresados_titulados: number
  por_sector: Record<string, number>
  encuestas_respondidas: number
  satisfaccion_promedio: number
  pertinencia_promedio: number
  tasa_recomendacion: number
  vacantes_activas: number
  postulaciones_contratado: number
}

export default function BolsaTrabajoPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const isGestion = user?.roles?.some((r: string) => ['superadmin', 'admin', 'control_escolar', 'direccion_academica'].includes(r))
  const isEgresado = user?.roles?.includes('alumno')

  const [tab, setTab] = useState<'vacantes' | 'indicadores'>('vacantes')
  const [showVacanteModal, setShowVacanteModal] = useState(false)
  const [postularVacante, setPostularVacante] = useState<Vacante | null>(null)
  const [egresadoId, setEgresadoId] = useState('')

  const [vacanteForm, setVacanteForm] = useState({
    empresa: '', puesto: '', descripcion: '', modalidad: 'presencial',
    rango_salarial: '', contacto_email: '', fecha_publicacion: '',
  })

  const { data: vacantes } = useQuery<{ data: Vacante[] }>({
    queryKey: ['vacantes-bolsa-trabajo'],
    queryFn: () => apiClient.get('/vacantes-bolsa-trabajo', { params: { solo_activas: true } }).then(r => r.data.data),
    enabled: tab === 'vacantes',
  })

  const { data: indicadores } = useQuery<Indicadores>({
    queryKey: ['indicadores-empleabilidad'],
    queryFn: () => apiClient.get('/indicadores/empleabilidad').then(r => r.data.data),
    enabled: tab === 'indicadores',
  })

  const mutCrearVacante = useMutation({
    mutationFn: () => apiClient.post('/vacantes-bolsa-trabajo', vacanteForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vacantes-bolsa-trabajo'] })
      setShowVacanteModal(false)
      toastSuccess('Vacante publicada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const mutPostular = useMutation({
    mutationFn: (vacanteId: string) => apiClient.post(`/vacantes-bolsa-trabajo/${vacanteId}/postulaciones`, { egresado_id: egresadoId }),
    onSuccess: () => {
      setPostularVacante(null)
      toastSuccess('Postulación registrada.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Bolsa de Trabajo y Seguimiento de Egresados</h1>
        <p className="text-sm text-slate-500 mt-0.5">Vacantes para egresados e indicadores de empleabilidad institucional</p>
      </div>

      <div className="flex gap-1 bg-white border border-slate-200 rounded-lg overflow-hidden w-fit">
        {[
          { key: 'vacantes', label: 'Bolsa de trabajo' },
          { key: 'indicadores', label: 'Indicadores de empleabilidad' },
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

      {/* Bolsa de trabajo */}
      {tab === 'vacantes' && (
        <>
          {isGestion && (
            <div className="flex justify-end">
              <button
                onClick={() => { setVacanteForm({ empresa: '', puesto: '', descripcion: '', modalidad: 'presencial', rango_salarial: '', contacto_email: '', fecha_publicacion: '' }); setShowVacanteModal(true) }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                + Publicar vacante
              </button>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {(vacantes?.data ?? []).length === 0 && (
              <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">Sin vacantes activas</div>
            )}
            {(vacantes?.data ?? []).map(v => (
              <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-800">{v.puesto}</p>
                <p className="text-sm text-slate-500">{v.empresa} · <span className="capitalize">{v.modalidad}</span></p>
                {v.rango_salarial && <p className="text-xs text-slate-400 mt-1">{v.rango_salarial}</p>}
                {v.descripcion && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{v.descripcion}</p>}
                {isEgresado && (
                  <button
                    onClick={() => { setEgresadoId(''); setPostularVacante(v) }}
                    className="mt-3 text-xs text-blue-600 hover:underline font-medium"
                  >
                    Postularme
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Indicadores */}
      {tab === 'indicadores' && indicadores && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total de egresados',      value: indicadores.total_egresados, color: 'text-slate-700' },
            { label: 'Titulados',               value: indicadores.egresados_titulados, color: 'text-green-700' },
            { label: 'Encuestas respondidas',   value: indicadores.encuestas_respondidas, color: 'text-blue-700' },
            { label: 'Satisfacción promedio',   value: indicadores.satisfaccion_promedio, color: 'text-blue-700' },
            { label: 'Pertinencia promedio',    value: indicadores.pertinencia_promedio, color: 'text-blue-700' },
            { label: 'Tasa de recomendación',   value: `${indicadores.tasa_recomendacion}%`, color: 'text-green-700' },
            { label: 'Vacantes activas',        value: indicadores.vacantes_activas, color: 'text-slate-700' },
            { label: 'Contratados vía bolsa',   value: indicadores.postulaciones_contratado, color: 'text-green-700' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal publicar vacante */}
      {showVacanteModal && (
        <ModalWrap title="Publicar vacante" onClose={() => setShowVacanteModal(false)} onSave={() => mutCrearVacante.mutate()} saving={mutCrearVacante.isPending}>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Empresa *</label>
            <input value={vacanteForm.empresa} onChange={e => setVacanteForm(f => ({ ...f, empresa: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Puesto *</label>
            <input value={vacanteForm.puesto} onChange={e => setVacanteForm(f => ({ ...f, puesto: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Modalidad</label>
            <select value={vacanteForm.modalidad} onChange={e => setVacanteForm(f => ({ ...f, modalidad: e.target.value }))} className={selectCls}>
              <option value="presencial">Presencial</option>
              <option value="remoto">Remoto</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Rango salarial</label>
            <input value={vacanteForm.rango_salarial} onChange={e => setVacanteForm(f => ({ ...f, rango_salarial: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Correo de contacto *</label>
            <input type="email" value={vacanteForm.contacto_email} onChange={e => setVacanteForm(f => ({ ...f, contacto_email: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha de publicación *</label>
            <input type="date" value={vacanteForm.fecha_publicacion} onChange={e => setVacanteForm(f => ({ ...f, fecha_publicacion: e.target.value }))} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Descripción</label>
            <textarea value={vacanteForm.descripcion} onChange={e => setVacanteForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} className={inputCls} />
          </div>
        </ModalWrap>
      )}

      {/* Modal postularse */}
      {postularVacante && (
        <ModalWrap title={`Postularme a ${postularVacante.puesto}`} onClose={() => setPostularVacante(null)} onSave={() => mutPostular.mutate(postularVacante.id)} saving={mutPostular.isPending}>
          <div className="col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">ID de mi registro como egresado *</label>
            <input value={egresadoId} onChange={e => setEgresadoId(e.target.value)} className={inputCls} placeholder="UUID del registro de egresado" />
          </div>
        </ModalWrap>
      )}
    </div>
  )
}
