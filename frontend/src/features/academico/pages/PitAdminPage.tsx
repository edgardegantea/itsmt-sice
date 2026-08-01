import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type AsignacionTutoria } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'
import ViewToggle, { useViewMode } from '../../../components/ui/ViewToggle'
import DetailModal from '../../../components/ui/DetailModal'
import BulkActionBar, { SelectCheckbox, ToggleSelectionButton } from '../../../components/ui/BulkActionBar'

export default function PitAdminPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore((s) => s.success)
  const toastError   = useToastStore((s) => s.error)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tutor_id: '', alumno_id: '', periodo_id: '' })
  const [vista, setVista] = useViewMode('pit-admin')
  const [detalle, setDetalle] = useState<AsignacionTutoria | null>(null)
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const toggleSel = (id: string) => setSeleccionados(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const { data, isLoading } = useQuery({
    queryKey: ['asignaciones-tutoria'],
    queryFn: () => academicoApi.getAsignacionesTutoria(),
  })

  const asignaciones: AsignacionTutoria[] = data?.data ?? []

  const crearMut = useMutation({
    mutationFn: (d: { tutor_id: string; alumno_id: string; periodo_id: string }) =>
      academicoApi.crearAsignacionTutoria(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones-tutoria'] })
      toastSuccess('Asignación creada correctamente')
      setShowForm(false)
      setForm({ tutor_id: '', alumno_id: '', periodo_id: '' })
    },
    onError: () => toastError('No se pudo crear la asignación'),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, activa }: { id: string; activa: boolean }) =>
      academicoApi.actualizarAsignacionTutoria(id, activa),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones-tutoria'] })
      toastSuccess('Asignación actualizada')
    },
    onError: () => toastError('Error al actualizar la asignación'),
  })

  const toggleBulkMut = useMutation({
    mutationFn: (activa: boolean) => Promise.allSettled(
      [...seleccionados].map(id => academicoApi.actualizarAsignacionTutoria(id, activa))
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones-tutoria'] })
      setSeleccionados(new Set())
      setModoSeleccion(false)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.tutor_id || !form.alumno_id || !form.periodo_id) return
    crearMut.mutate(form)
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Asignaciones Tutor–Tutorado</h1>
            <p className="text-sm text-slate-500 mt-1">Gestión de asignaciones del Programa Institucional de Tutoría</p>
          </div>
          <div className="flex items-center gap-2">
            <ToggleSelectionButton active={modoSeleccion} onClick={() => { setModoSeleccion(v => !v); setSeleccionados(new Set()) }} />
            <ViewToggle value={vista} onChange={setVista} />
            <button
              onClick={() => setShowForm(v => !v)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showForm ? 'Cancelar' : '+ Nueva asignación'}
            </button>
          </div>
        </div>

        {modoSeleccion && seleccionados.size > 0 && (
          <BulkActionBar count={seleccionados.size} onCancel={() => { setSeleccionados(new Set()); setModoSeleccion(false) }}>
            <button onClick={() => toggleBulkMut.mutate(true)} disabled={toggleBulkMut.isPending} className="px-3 py-1.5 text-xs font-medium bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">Activar</button>
            <button onClick={() => toggleBulkMut.mutate(false)} disabled={toggleBulkMut.isPending} className="px-3 py-1.5 text-xs font-medium bg-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50">Desactivar</button>
          </BulkActionBar>
        )}

        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Nueva Asignación</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ID Tutor (UUID)</label>
                <input
                  type="text"
                  value={form.tutor_id}
                  onChange={e => setForm(f => ({ ...f, tutor_id: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="UUID del tutor"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ID Alumno (UUID)</label>
                <input
                  type="text"
                  value={form.alumno_id}
                  onChange={e => setForm(f => ({ ...f, alumno_id: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="UUID del alumno"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ID Periodo (UUID)</label>
                <input
                  type="text"
                  value={form.periodo_id}
                  onChange={e => setForm(f => ({ ...f, periodo_id: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="UUID del periodo"
                  required
                />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={crearMut.isPending}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {crearMut.isPending ? 'Guardando…' : 'Guardar asignación'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Asignaciones registradas</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-16 text-slate-400">Cargando asignaciones...</div>
          ) : asignaciones.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <p className="font-medium">Sin asignaciones</p>
              <p className="text-sm mt-1">Crea la primera asignación tutor–tutorado</p>
            </div>
          ) : vista === 'lista' ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {modoSeleccion && <th className="w-8" />}
                  <th className="text-left py-3 px-5 font-semibold text-slate-600">Tutor</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Tutorado</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Periodo</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Estado</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Acciones</th>
                  <th className="text-right py-3 px-5" />
                </tr>
              </thead>
              <tbody>
                {asignaciones.map((a, i) => (
                  <tr key={a.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    {modoSeleccion && <td className="pl-4"><SelectCheckbox checked={seleccionados.has(a.id)} onChange={() => toggleSel(a.id)} /></td>}
                    <td className="py-3 px-5 text-slate-800">{a.tutor?.docente?.name ?? a.tutor_id}</td>
                    <td className="py-3 px-4 text-slate-600">{a.alumno?.name ?? a.alumno_id}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{a.periodo?.nombre ?? a.periodo_id}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        a.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {a.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleMut.mutate({ id: a.id, activa: !a.activa })}
                        disabled={toggleMut.isPending}
                        className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                          a.activa
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {a.activa ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button onClick={() => setDetalle(a)} className="text-xs font-medium text-slate-500 hover:underline whitespace-nowrap">Ver detalle</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
              {asignaciones.map(a => (
                <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {modoSeleccion && <SelectCheckbox checked={seleccionados.has(a.id)} onChange={() => toggleSel(a.id)} />}
                      <p className="font-medium text-slate-800 truncate">{a.tutor?.docente?.name ?? a.tutor_id}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${a.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {a.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{a.alumno?.name ?? a.alumno_id}</p>
                  <p className="text-xs text-slate-500">{a.periodo?.nombre ?? a.periodo_id}</p>
                  <div className="flex gap-3 mt-1">
                    <button
                      onClick={() => toggleMut.mutate({ id: a.id, activa: !a.activa })}
                      disabled={toggleMut.isPending}
                      className={`text-xs font-medium ${a.activa ? 'text-red-600 hover:underline' : 'text-emerald-700 hover:underline'} disabled:opacity-50`}
                    >
                      {a.activa ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => setDetalle(a)} className="text-xs font-medium text-slate-500 hover:underline">Ver detalle</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {detalle && (
        <DetailModal
          title={detalle.tutor?.docente?.name ?? 'Asignación'}
          onClose={() => setDetalle(null)}
          fields={[
            { label: 'Tutorado', value: detalle.alumno?.name ?? detalle.alumno_id },
            { label: 'Periodo', value: detalle.periodo?.nombre ?? detalle.periodo_id },
            { label: 'Estado', value: detalle.activa ? 'Activa' : 'Inactiva' },
          ]}
          footer={
            <button
              onClick={() => { toggleMut.mutate({ id: detalle.id, activa: !detalle.activa }); setDetalle(null) }}
              className={`text-xs font-medium text-white px-3 py-1.5 rounded-lg ${detalle.activa ? 'bg-red-600' : 'bg-emerald-600'}`}
            >
              {detalle.activa ? 'Desactivar' : 'Activar'}
            </button>
          }
        />
      )}
    </div>
  )
}
