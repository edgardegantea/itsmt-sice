import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import Modal from '../../../components/ui/Modal'
import { useToastStore } from '../../../store/toastStore'

interface Carrera {
  id: string
  nombre: string
  clave: string
  codigo_it: string
  plan_clave: string | null
  especialidad: string | null
  activa: boolean
  alumnos_count?: number
  aspirantes_count?: number
}

const API = {
  list:         () => apiClient.get('/admin/carreras').then(r => r.data.data as Carrera[]),
  create:       (d: Partial<Carrera>) => apiClient.post('/admin/carreras', d).then(r => r.data.data as Carrera),
  update:       (id: string, d: Partial<Carrera>) => apiClient.patch(`/admin/carreras/${id}`, d).then(r => r.data.data as Carrera),
  toggleActiva: (id: string) => apiClient.patch(`/admin/carreras/${id}/toggle-activa`).then(r => r.data.data as Carrera),
}

function CarreraForm({
  inicial,
  onGuardar,
  onCancelar,
  cargando,
}: {
  inicial?: Partial<Carrera>
  onGuardar: (d: Partial<Carrera>) => void
  onCancelar: () => void
  cargando: boolean
}) {
  const [form, setForm] = useState<Partial<Carrera>>(inicial ?? { activa: true })
  const set = (k: keyof Carrera, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onGuardar(form) }} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Nombre de la carrera *</label>
          <input required value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)}
            placeholder="Ej. Ingeniería en Sistemas Computacionales"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Clave * (siglas)</label>
          <input required value={form.clave ?? ''} onChange={e => set('clave', e.target.value.toUpperCase())}
            placeholder="Ej. ISC"
            maxLength={10}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Código TecNM (2–3 dígitos) *</label>
          <input required value={form.codigo_it ?? ''} onChange={e => set('codigo_it', e.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder="Ej. 006"
            maxLength={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30" />
          <p className="text-xs text-slate-400 mt-1">Segmento NNN del número de control TecNM.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Clave plan de estudios</label>
          <input value={form.plan_clave ?? ''} onChange={e => set('plan_clave', e.target.value)}
            placeholder="Ej. ISIC-2010-227"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Especialidad</label>
          <input value={form.especialidad ?? ''} onChange={e => set('especialidad', e.target.value)}
            placeholder="Opcional"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30" />
        </div>
        <div className="flex items-center gap-2 pt-4">
          <input type="checkbox" id="activa" checked={!!form.activa} onChange={e => set('activa', e.target.checked)}
            className="w-4 h-4 accent-[#1a3a5c]" />
          <label htmlFor="activa" className="text-sm text-slate-700">Carrera activa (visible en formularios)</label>
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

export default function CarrerasPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'nueva' | Carrera | null>(null)
  const { success, error: toastError } = useToastStore()

  const { data: carreras = [], isLoading } = useQuery({ queryKey: ['admin-carreras'], queryFn: API.list })

  const guardar = useMutation({
    mutationFn: (d: Partial<Carrera>) =>
      modal === 'nueva' ? API.create(d) : API.update((modal as Carrera).id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-carreras'] })
      success(modal === 'nueva' ? 'Carrera creada correctamente.' : 'Carrera actualizada correctamente.')
      setModal(null)
    },
    onError: () => toastError('Error al guardar la carrera. Verifica que la clave no esté duplicada.'),
  })

  const toggleActiva = useMutation({
    mutationFn: (id: string) => API.toggleActiva(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-carreras'] })
      success(data.activa ? `Carrera "${data.clave}" activada.` : `Carrera "${data.clave}" desactivada.`)
    },
    onError: () => toastError('Error al cambiar el estado de la carrera.'),
  })

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Carreras</h1>
          <p className="text-sm text-slate-500 mt-0.5">{carreras.length} carrera(s) registrada(s).</p>
        </div>
        <button
          onClick={() => setModal('nueva')}
          className="shrink-0 px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#234d7a] rounded-lg transition-colors"
        >
          + Nueva carrera
        </button>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando…</p>}

      {/* Tabla escritorio */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Carrera</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Clave</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cód. TecNM</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Alumnos</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {carreras.map(c => (
              <tr key={c.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {c.nombre}
                  {c.especialidad && <span className="text-xs text-slate-400 ml-1">· {c.especialidad}</span>}
                </td>
                <td className="px-4 py-3 font-mono text-slate-600">{c.clave}</td>
                <td className="px-4 py-3 font-mono text-slate-500">{c.codigo_it}</td>
                <td className="px-4 py-3 text-slate-500">{c.alumnos_count ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {c.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => toggleActiva.mutate(c.id)}
                      disabled={toggleActiva.isPending}
                      className="text-xs text-slate-400 hover:text-slate-600 hover:underline disabled:opacity-60"
                    >
                      {c.activa ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => setModal(c)}
                      className="text-xs text-[#1a3a5c] hover:underline font-medium"
                    >
                      Editar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas móvil */}
      <div className="md:hidden space-y-3">
        {carreras.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-medium text-slate-800 text-sm">{c.nombre}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{c.clave} · Cód. {c.codigo_it}</p>
              </div>
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${c.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {c.activa ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => toggleActiva.mutate(c.id)} disabled={toggleActiva.isPending}
                className="flex-1 text-xs text-center border border-slate-300 rounded-lg py-1.5 hover:bg-slate-50 disabled:opacity-60">
                {c.activa ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => setModal(c)}
                className="flex-1 text-xs text-center text-[#1a3a5c] border border-[#1a3a5c]/30 rounded-lg py-1.5 hover:bg-[#1a3a5c]/5 font-medium">
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal
          title={modal === 'nueva' ? 'Nueva carrera' : `Editar: ${(modal as Carrera).clave}`}
          onClose={() => setModal(null)}
        >
          <CarreraForm
            inicial={modal !== 'nueva' ? modal : undefined}
            onGuardar={d => guardar.mutate(d)}
            onCancelar={() => setModal(null)}
            cargando={guardar.isPending}
          />
        </Modal>
      )}
    </div>
  )
}
