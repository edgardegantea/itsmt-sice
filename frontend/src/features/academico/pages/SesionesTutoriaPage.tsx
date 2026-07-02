import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type SesionTutoria } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'

export default function SesionesTutoriaPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore((s) => s.success)
  const toastError   = useToastStore((s) => s.error)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    tipo: 'individual' as 'individual' | 'grupal',
    fecha: '',
    duracion_minutos: 60,
    temas_tratados: '',
    observaciones: '',
    alumnos_ids: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['sesiones-tutoria'],
    queryFn: () => academicoApi.getSesionesTutoria(),
  })

  const sesiones: SesionTutoria[] = data?.data ?? []

  const crearMut = useMutation({
    mutationFn: () => academicoApi.registrarSesionTutoria({
      tipo: form.tipo,
      fecha: form.fecha,
      duracion_minutos: form.duracion_minutos,
      temas_tratados: form.temas_tratados,
      observaciones: form.observaciones || undefined,
      alumnos_atendidos_ids: form.alumnos_ids.split(',').map(s => s.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sesiones-tutoria'] })
      toastSuccess('Sesión registrada correctamente')
      setShowForm(false)
      setForm({ tipo: 'individual', fecha: '', duracion_minutos: 60, temas_tratados: '', observaciones: '', alumnos_ids: '' })
    },
    onError: () => toastError('No se pudo registrar la sesión'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fecha || !form.temas_tratados) return
    crearMut.mutate()
  }

  function formatFecha(iso: string) {
    if (!iso) return '—'
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Mis Sesiones de Tutoría</h1>
            <p className="text-sm text-slate-500 mt-1">Registro de sesiones individuales y grupales</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Cancelar' : '+ Registrar sesión'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Nueva Sesión de Tutoría</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'individual' | 'grupal' }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="individual">Individual</option>
                    <option value="grupal">Grupal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Duración (minutos)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.duracion_minutos}
                    onChange={e => setForm(f => ({ ...f, duracion_minutos: Number(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Temas tratados</label>
                <textarea
                  value={form.temas_tratados}
                  onChange={e => setForm(f => ({ ...f, temas_tratados: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe los temas abordados en la sesión..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones (opcional)</label>
                <textarea
                  value={form.observaciones}
                  onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notas adicionales..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  IDs de alumnos atendidos (UUIDs separados por coma)
                </label>
                <input
                  type="text"
                  value={form.alumnos_ids}
                  onChange={e => setForm(f => ({ ...f, alumnos_ids: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="uuid1, uuid2, uuid3..."
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={crearMut.isPending}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {crearMut.isPending ? 'Guardando…' : 'Registrar sesión'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Historial de sesiones</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-16 text-slate-400">Cargando sesiones...</div>
          ) : sesiones.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <p className="font-medium">Sin sesiones registradas</p>
              <p className="text-sm mt-1">Registra tu primera sesión de tutoría</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-5 font-semibold text-slate-600">Fecha</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Tipo</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Duración</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Temas tratados</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Alumnos</th>
                </tr>
              </thead>
              <tbody>
                {sesiones.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3 px-5 font-medium text-slate-800">{formatFecha(s.fecha)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        s.tipo === 'individual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {s.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">{s.duracion_minutos ? `${s.duracion_minutos} min` : '—'}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={s.temas_tratados}>{s.temas_tratados}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                        {Array.isArray(s.alumnos_atendidos_ids) ? s.alumnos_atendidos_ids.length : 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
