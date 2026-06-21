import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import Modal from '../../../components/ui/Modal'
import { useToastStore } from '../../../store/toastStore'
import { useAuthStore } from '../../../store/authStore'

interface Periodo {
  id: string
  nombre: string
  tipo: 'ordinario' | 'verano' | 'intersemestral'
  fecha_inicio: string
  fecha_fin: string
  activo: boolean
  fecha_limite_baja_parcial: string | null
  fecha_limite_baja_temporal: string | null
  aspirantes_count?: number
  inscripciones_count?: number
}

const API = {
  list:    () => apiClient.get('/admin/periodos').then(r => r.data.data as Periodo[]),
  create:  (d: Partial<Periodo>) => apiClient.post('/admin/periodos', d).then(r => r.data.data as Periodo),
  update:  (id: string, d: Partial<Periodo>) => apiClient.patch(`/admin/periodos/${id}`, d).then(r => r.data.data as Periodo),
  activar:  (id: string) => apiClient.patch(`/admin/periodos/${id}/activar`).then(r => r.data.data as Periodo),
  eliminar: (id: string) => apiClient.delete(`/admin/periodos/${id}`).then(r => r.data),
}

const fmtFecha = (s: string | null) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-MX') : '—'
const toDateInput = (s: string | null | undefined): string => s ? s.slice(0, 10) : ''

function PeriodoForm({
  inicial,
  onGuardar,
  onCancelar,
  cargando,
}: {
  inicial?: Partial<Periodo>
  onGuardar: (d: Partial<Periodo>) => void
  onCancelar: () => void
  cargando: boolean
}) {
  const [form, setForm] = useState<Partial<Periodo>>(inicial ? {
    ...inicial,
    fecha_inicio:              toDateInput(inicial.fecha_inicio),
    fecha_fin:                 toDateInput(inicial.fecha_fin),
    fecha_limite_baja_parcial: toDateInput(inicial.fecha_limite_baja_parcial),
    fecha_limite_baja_temporal: toDateInput(inicial.fecha_limite_baja_temporal),
  } : { tipo: 'ordinario', activo: false })
  const set = (k: keyof Periodo, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onGuardar(form) }} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del periodo *</label>
          <input required value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)}
            placeholder="Ej. 2025-A Agosto–Diciembre"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
          <select required value={form.tipo ?? 'ordinario'} onChange={e => set('tipo', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30">
            <option value="ordinario">Ordinario</option>
            <option value="verano">Verano</option>
            <option value="intersemestral">Intersemestral</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Activo</label>
          <label className="flex items-center gap-2 mt-2">
            <input type="checkbox" checked={!!form.activo} onChange={e => set('activo', e.target.checked)}
              className="w-4 h-4 accent-[#1a3a5c]" />
            <span className="text-sm text-slate-700">Periodo actual (desactiva los demás)</span>
          </label>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fecha inicio *</label>
          <input required type="date" value={form.fecha_inicio ?? ''} onChange={e => set('fecha_inicio', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fecha fin *</label>
          <input required type="date" value={form.fecha_fin ?? ''} onChange={e => set('fecha_fin', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Límite baja parcial</label>
          <input type="date" value={form.fecha_limite_baja_parcial ?? ''} onChange={e => set('fecha_limite_baja_parcial', e.target.value || null)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Límite baja temporal</label>
          <input type="date" value={form.fecha_limite_baja_temporal ?? ''} onChange={e => set('fecha_limite_baja_temporal', e.target.value || null)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancelar} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
        <button type="submit" disabled={cargando} className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-60 rounded-lg">
          {cargando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

export default function PeriodosPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'nuevo' | Periodo | null>(null)
  const { success, error: toastError } = useToastStore()
  const { user } = useAuthStore()
  const esSuperadmin = user?.roles?.includes('superadmin') ?? false

  const { data: periodos = [], isLoading } = useQuery({ queryKey: ['admin-periodos'], queryFn: API.list })

  const guardar = useMutation({
    mutationFn: (d: Partial<Periodo>) =>
      modal === 'nuevo' ? API.create(d) : API.update((modal as Periodo).id, d),
    onSuccess: (_, __, _ctx) => {
      qc.invalidateQueries({ queryKey: ['admin-periodos'] })
      success(modal === 'nuevo' ? 'Periodo creado correctamente.' : 'Periodo actualizado correctamente.')
      setModal(null)
    },
    onError: () => toastError('Error al guardar el periodo. Verifica los datos e intenta de nuevo.'),
  })

  const activar = useMutation({
    mutationFn: (id: string) => API.activar(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-periodos'] })
      success(`Periodo "${data.nombre}" activado correctamente.`)
    },
    onError: () => toastError('Error al activar el periodo.'),
  })

  const eliminar = useMutation({
    mutationFn: (id: string) => API.eliminar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-periodos'] })
      success('Periodo eliminado correctamente.')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toastError(err?.response?.data?.message ?? 'Error al eliminar el periodo.'),
  })

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Periodos escolares</h1>
          <p className="text-sm text-slate-500 mt-0.5">Solo un periodo puede estar activo a la vez.</p>
        </div>
        <button
          onClick={() => setModal('nuevo')}
          className="shrink-0 px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] rounded-lg transition-colors"
        >
          + Nuevo periodo
        </button>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando…</p>}

      <div className="space-y-3">
        {periodos.map(p => (
          <div key={p.id} className={`bg-white rounded-xl border p-4 ${p.activo ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-medium text-slate-800">{p.nombre}</h2>
                  {p.activo && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                      Activo
                    </span>
                  )}
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                    {p.tipo}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {fmtFecha(p.fecha_inicio)} — {fmtFecha(p.fecha_fin)}
                </p>
                <div className="flex gap-4 text-xs text-slate-400 mt-1 flex-wrap">
                  <span>{p.aspirantes_count ?? 0} aspirantes</span>
                  <span>{p.inscripciones_count ?? 0} inscritos</span>
                  {p.fecha_limite_baja_parcial && (
                    <span>Límite baja parcial: {fmtFecha(p.fecha_limite_baja_parcial)}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {!p.activo && (
                  <button
                    onClick={() => activar.mutate(p.id)}
                    disabled={activar.isPending}
                    className="px-3 py-1.5 text-xs text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-60"
                  >
                    Activar
                  </button>
                )}
                <button
                  onClick={() => setModal(p)}
                  className="px-3 py-1.5 text-xs text-[#1a3a5c] border border-[#1a3a5c]/30 rounded-lg hover:bg-[#1a3a5c]/5 transition-colors"
                >
                  Editar
                </button>
                {esSuperadmin && !p.activo && (
                  <button
                    onClick={() => window.confirm(`¿Eliminar el periodo "${p.nombre}"? Esta acción no se puede deshacer.`) && eliminar.mutate(p.id)}
                    disabled={eliminar.isPending}
                    className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal
          title={modal === 'nuevo' ? 'Nuevo periodo' : `Editar: ${(modal as Periodo).nombre}`}
          onClose={() => setModal(null)}
        >
          <PeriodoForm
            inicial={modal !== 'nuevo' ? modal : undefined}
            onGuardar={d => guardar.mutate(d)}
            onCancelar={() => setModal(null)}
            cargando={guardar.isPending}
          />
        </Modal>
      )}
    </div>
  )
}
