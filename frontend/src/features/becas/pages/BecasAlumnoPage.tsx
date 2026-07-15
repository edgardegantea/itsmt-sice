import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'
import apiClient from '../../../config/apiClient'
import { inputCls, selectCls, mutationError } from '../../academico/pages/tabs/shared'

interface SolicitudBeca {
  id: string
  tipo_beca: string
  promedio?: number
  ingreso_familiar?: number
  estatus: string
  created_at: string
  beca_asignada?: {
    monto_mensual?: number
    duracion_meses?: number
    fecha_inicio?: string
    estatus: string
  }
}

interface Periodo { id: string; nombre: string }

const TIPOS_BECA = [
  { value: 'excelencia',         label: 'Excelencia académica' },
  { value: 'transporte',         label: 'Apoyo de transporte' },
  { value: 'manutension',        label: 'Manutención TecNM' },
  { value: 'discapacidad',       label: 'Discapacidad' },
  { value: 'deporte',            label: 'Deporte' },
  { value: 'actividades_extras', label: 'Actividades extracurriculares' },
]

export default function BecasAlumnoPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ periodo_id: '', tipo_beca: '', promedio: '', ingreso_familiar: '' })

  const { data: periodos = [] } = useQuery<Periodo[]>({
    queryKey: ['periodos-lista'],
    queryFn: () => apiClient.get('/periodos').then(r => r.data.data ?? []),
  })

  const { data: alumno } = useQuery({
    queryKey: ['alumno-actual', user?.id],
    queryFn: () => apiClient.get('/alumnos/me').then(r => r.data.data),
    enabled: !!user?.id,
  })

  const { data: historial = [] } = useQuery<SolicitudBeca[]>({
    queryKey: ['historial-becas', alumno?.id],
    queryFn: () => apiClient.get(`/alumnos/${alumno!.id}/historial-becas`).then(r => r.data.data ?? []),
    enabled: !!alumno?.id,
  })

  const mutSolicitar = useMutation({
    mutationFn: () => apiClient.post('/solicitudes-beca', {
      periodo_id:      form.periodo_id,
      tipo_beca:       form.tipo_beca,
      promedio:        form.promedio       ? parseFloat(form.promedio)       : undefined,
      ingreso_familiar: form.ingreso_familiar ? parseFloat(form.ingreso_familiar) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['historial-becas'] })
      setShowModal(false)
      toastSuccess('Solicitud de beca enviada correctamente.')
    },
    onError: (e) => toastError(mutationError(e)),
  })

  const estatusColors: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-700',
    validada:  'bg-blue-100 text-blue-700',
    rechazada: 'bg-red-100 text-red-700',
    asignada:  'bg-green-100 text-green-700',
    cancelada: 'bg-slate-100 text-slate-500',
  }

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mis Becas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Solicitud y seguimiento de apoyos económicos TecNM</p>
        </div>
        <button
          onClick={() => { setForm({ periodo_id: '', tipo_beca: '', promedio: '', ingreso_familiar: '' }); setShowModal(true) }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          + Solicitar beca
        </button>
      </div>

      {historial.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-slate-400 text-sm">No tienes solicitudes de beca aún.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg"
          >
            Solicitar mi primera beca
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {historial.map(sol => (
            <div key={sol.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800 capitalize">
                    {TIPOS_BECA.find(t => t.value === sol.tipo_beca)?.label ?? sol.tipo_beca}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Solicitada: {new Date(sol.created_at).toLocaleDateString('es-MX')}
                  </p>
                  {sol.promedio && <p className="text-xs text-slate-500 mt-0.5">Promedio: {sol.promedio}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${estatusColors[sol.estatus] ?? 'bg-slate-100 text-slate-600'}`}>
                  {sol.estatus}
                </span>
              </div>

              {sol.beca_asignada && (
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-slate-400">Monto mensual</p>
                    <p className="font-semibold text-green-700">${Number(sol.beca_asignada.monto_mensual ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Duración</p>
                    <p className="font-semibold text-slate-700">{sol.beca_asignada.duracion_meses} meses</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Inicio</p>
                    <p className="font-semibold text-slate-700">{sol.beca_asignada.fecha_inicio ?? '—'}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Solicitar beca</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Periodo *</label>
                <select value={form.periodo_id} onChange={e => setForm(f => ({ ...f, periodo_id: e.target.value }))} className={selectCls}>
                  <option value="">Seleccionar…</option>
                  {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo de beca *</label>
                <select value={form.tipo_beca} onChange={e => setForm(f => ({ ...f, tipo_beca: e.target.value }))} className={selectCls}>
                  <option value="">Seleccionar…</option>
                  {TIPOS_BECA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Promedio actual</label>
                <input
                  type="number"
                  value={form.promedio}
                  onChange={e => setForm(f => ({ ...f, promedio: e.target.value }))}
                  className={inputCls}
                  min={0}
                  max={100}
                  step={0.1}
                  placeholder="Ej. 87.5"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Ingreso familiar mensual ($)</label>
                <input
                  type="number"
                  value={form.ingreso_familiar}
                  onChange={e => setForm(f => ({ ...f, ingreso_familiar: e.target.value }))}
                  className={inputCls}
                  min={0}
                  placeholder="Ej. 5000"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700">
                Cancelar
              </button>
              <button
                onClick={() => mutSolicitar.mutate()}
                disabled={mutSolicitar.isPending || !form.periodo_id || !form.tipo_beca}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {mutSolicitar.isPending ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
