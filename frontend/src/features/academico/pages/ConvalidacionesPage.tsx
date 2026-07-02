import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type Convalidacion } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'

export default function ConvalidacionesPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const [showForm, setShowForm] = useState(false)
  const [filtroAlumno, setFiltroAlumno] = useState('')
  const [form, setForm] = useState({
    alumno_id: '',
    materia_origen_nombre: '',
    materia_origen_clave: '',
    calificacion_obtenida: '',
    institucion_origen: '',
    dictamen_url: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['convalidaciones', filtroAlumno],
    queryFn: () => academicoApi.getConvalidaciones({ alumno_id: filtroAlumno || undefined }),
  })

  const convalidaciones: Convalidacion[] = data?.data ?? []

  const crearMut = useMutation({
    mutationFn: () => academicoApi.registrarConvalidacion({
      alumno_id:             form.alumno_id,
      materia_origen_nombre: form.materia_origen_nombre,
      materia_origen_clave:  form.materia_origen_clave,
      calificacion_obtenida: Number(form.calificacion_obtenida),
      institucion_origen:    form.institucion_origen,
      dictamen_url:          form.dictamen_url || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['convalidaciones'] })
      toastSuccess('Convalidación registrada correctamente')
      setShowForm(false)
      setForm({ alumno_id: '', materia_origen_nombre: '', materia_origen_clave: '', calificacion_obtenida: '', institucion_origen: '', dictamen_url: '' })
    },
    onError: () => toastError('No se pudo registrar la convalidación'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    crearMut.mutate()
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Convalidaciones</h1>
            <p className="text-sm text-slate-500 mt-1">Registro de materias convalidadas por cambio de plan de estudios — TecNM Cap. 7</p>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            {showForm ? 'Cancelar' : '+ Registrar convalidación'}
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
          <strong>TecNM Cap. 7:</strong> La convalidación aplica cuando el alumno cambia de plan de estudios (única ocasión). Se recalcula el semestre y los créditos acumulados.
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Nueva Convalidación</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ID Alumno (UUID)</label>
                <input type="text" value={form.alumno_id} onChange={e => setForm(f => ({ ...f, alumno_id: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="UUID del alumno" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Institución de origen</label>
                <input type="text" value={form.institucion_origen} onChange={e => setForm(f => ({ ...f, institucion_origen: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="TecNM Campus Veracruz" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre materia origen</label>
                <input type="text" value={form.materia_origen_nombre} onChange={e => setForm(f => ({ ...f, materia_origen_nombre: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Cálculo Diferencial" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Clave materia origen</label>
                <input type="text" value={form.materia_origen_clave} onChange={e => setForm(f => ({ ...f, materia_origen_clave: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ACA-0407" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Calificación obtenida</label>
                <input type="number" min={0} max={100} step={0.1} value={form.calificacion_obtenida}
                  onChange={e => setForm(f => ({ ...f, calificacion_obtenida: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="85" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">URL dictamen (opcional)</label>
                <input type="text" value={form.dictamen_url} onChange={e => setForm(f => ({ ...f, dictamen_url: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..." />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" disabled={crearMut.isPending}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {crearMut.isPending ? 'Guardando…' : 'Registrar convalidación'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex gap-3">
          <input type="text" value={filtroAlumno} onChange={e => setFiltroAlumno(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
            placeholder="Filtrar por UUID de alumno..." />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Convalidaciones registradas</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-16 text-slate-400">Cargando...</div>
          ) : convalidaciones.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <p className="font-medium">Sin convalidaciones registradas</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-5 font-semibold text-slate-600">Alumno</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Materia origen</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Institución</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Calificación</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Equivalente ITSMT</th>
                </tr>
              </thead>
              <tbody>
                {convalidaciones.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3 px-5 text-slate-800">{c.alumno?.name ?? c.alumno_id}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{c.materia_origen_nombre}</p>
                      <p className="text-xs text-slate-400">{c.materia_origen_clave}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">{c.institucion_origen}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        Number(c.calificacion_obtenida) >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {c.calificacion_obtenida}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {c.materia_equivalente?.nombre ?? <span className="text-slate-300">—</span>}
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
