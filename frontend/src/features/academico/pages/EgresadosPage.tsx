import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type Egresado } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'

const SECTORES = ['publico', 'privado', 'emprendimiento', 'desempleado', 'otro'] as const

export default function EgresadosPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)
  const toast = { success: toastSuccess, error: toastError }

  const [anio, setAnio] = useState<number | undefined>()
  const [titulado, setTitulado] = useState<boolean | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Egresado | null>(null)

  const [form, setForm] = useState({
    alumno_id: '',
    anio_egreso: new Date().getFullYear(),
    titulado: false,
    sector: '',
    empresa_actual: '',
    puesto_actual: '',
    correo_actualizado: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['egresados', anio, titulado],
    queryFn: () => academicoApi.getEgresados({ anio, titulado }),
  })

  const egresados: Egresado[] = data?.data ?? []

  const mutCreate = useMutation({
    mutationFn: () => academicoApi.registrarEgresado({
      alumno_id: form.alumno_id,
      anio_egreso: form.anio_egreso,
      titulado: form.titulado,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sector: (form.sector || undefined) as any,
      empresa_actual: form.empresa_actual || undefined,
      puesto_actual: form.puesto_actual || undefined,
      correo_actualizado: form.correo_actualizado || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['egresados'] })
      toast.success('Egresado registrado correctamente.')
      setShowForm(false)
    },
    onError: () => toast.error('Error al registrar egresado.'),
  })

  const mutUpdate = useMutation({
    mutationFn: (id: string) => academicoApi.actualizarEgresado(id, {
      anio_egreso: form.anio_egreso,
      titulado: form.titulado,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sector: (form.sector || undefined) as any,
      empresa_actual: form.empresa_actual || undefined,
      puesto_actual: form.puesto_actual || undefined,
      correo_actualizado: form.correo_actualizado || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['egresados'] })
      toast.success('Egresado actualizado.')
      setEditing(null)
      setShowForm(false)
    },
    onError: () => toast.error('Error al actualizar egresado.'),
  })

  function openCreate() {
    setEditing(null)
    setForm({ alumno_id: '', anio_egreso: new Date().getFullYear(), titulado: false, sector: '', empresa_actual: '', puesto_actual: '', correo_actualizado: '' })
    setShowForm(true)
  }

  function openEdit(e: Egresado) {
    setEditing(e)
    setForm({
      alumno_id: e.alumno_id,
      anio_egreso: e.anio_egreso,
      titulado: e.titulado,
      sector: e.sector ?? '',
      empresa_actual: e.empresa_actual ?? '',
      puesto_actual: e.puesto_actual ?? '',
      correo_actualizado: e.correo_actualizado ?? '',
    })
    setShowForm(true)
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (editing) mutUpdate.mutate(editing.id)
    else mutCreate.mutate()
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Egresados</h1>
            <p className="text-sm text-slate-500 mt-1">Registro y seguimiento de egresados institucionales</p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Registrar Egresado
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Año egreso</label>
              <input
                type="number"
                value={anio ?? ''}
                onChange={e => setAnio(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Todos"
                className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Titulación</label>
              <select
                value={titulado === undefined ? '' : String(titulado)}
                onChange={e => setTitulado(e.target.value === '' ? undefined : e.target.value === 'true')}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Todos</option>
                <option value="true">Titulados</option>
                <option value="false">No titulados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center py-16 text-slate-400">Cargando...</div>
          ) : egresados.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <p className="font-medium">Sin egresados registrados</p>
              <p className="text-sm mt-1">Registra el primer egresado usando el botón superior</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Alumno</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Año</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Titulado</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Sector</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Empresa</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Correo</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {egresados.map((eg, i) => (
                  <tr key={eg.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3 px-4 font-medium text-slate-800">{eg.alumno?.name ?? eg.alumno_id.slice(0, 8)}</td>
                    <td className="py-3 px-4 text-slate-600">{eg.anio_egreso}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${eg.titulado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {eg.titulado ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 capitalize">{eg.sector ?? '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{eg.empresa_actual ?? '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{eg.correo_actualizado ?? eg.alumno?.email ?? '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEdit(eg)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {editing ? 'Editar Egresado' : 'Registrar Egresado'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ID Usuario (alumno_id) *</label>
                  <input
                    required
                    value={form.alumno_id}
                    onChange={e => setForm(f => ({ ...f, alumno_id: e.target.value }))}
                    placeholder="UUID del usuario alumno"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Año de egreso *</label>
                  <input
                    required
                    type="number"
                    value={form.anio_egreso}
                    onChange={e => setForm(f => ({ ...f, anio_egreso: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sector</label>
                  <select
                    value={form.sector}
                    onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">Sin especificar</option>
                    {SECTORES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="titulado"
                  checked={form.titulado}
                  onChange={e => setForm(f => ({ ...f, titulado: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="titulado" className="text-sm font-medium text-slate-700">Titulado</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa actual</label>
                <input
                  value={form.empresa_actual}
                  onChange={e => setForm(f => ({ ...f, empresa_actual: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Puesto actual</label>
                <input
                  value={form.puesto_actual}
                  onChange={e => setForm(f => ({ ...f, puesto_actual: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo actualizado</label>
                <input
                  type="email"
                  value={form.correo_actualizado}
                  onChange={e => setForm(f => ({ ...f, correo_actualizado: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mutCreate.isPending || mutUpdate.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {editing ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
