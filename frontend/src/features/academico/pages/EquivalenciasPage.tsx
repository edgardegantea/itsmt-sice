import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type Equivalencia, type MateriasEquivalencia } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'

export default function EquivalenciasPage() {
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError   = useToastStore(s => s.error)

  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [form, setForm] = useState({
    alumno_id: '',
    institucion_origen: '',
    dictamen_url: '',
  })
  const [materiasRaw, setMateriasRaw] = useState<MateriasEquivalencia[]>([
    { clave: '', nombre: '', calificacion: 0, creditos: 0 },
  ])

  const { data, isLoading } = useQuery({
    queryKey: ['equivalencias'],
    queryFn: () => academicoApi.getEquivalencias(),
  })

  const equivalencias: Equivalencia[] = data?.data ?? []

  const crearMut = useMutation({
    mutationFn: () => academicoApi.registrarEquivalencia({
      alumno_id:          form.alumno_id,
      institucion_origen: form.institucion_origen,
      materias_json:      materiasRaw,
      dictamen_url:       form.dictamen_url || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equivalencias'] })
      toastSuccess('Equivalencia registrada correctamente')
      setShowForm(false)
      setForm({ alumno_id: '', institucion_origen: '', dictamen_url: '' })
      setMateriasRaw([{ clave: '', nombre: '', calificacion: 0, creditos: 0 }])
    },
    onError: () => toastError('No se pudo registrar la equivalencia'),
  })

  function updateMateria(idx: number, field: keyof MateriasEquivalencia, value: string | number) {
    setMateriasRaw(ms => ms.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  function addMateria() {
    setMateriasRaw(ms => [...ms, { clave: '', nombre: '', calificacion: 0, creditos: 0 }])
  }

  function removeMateria(idx: number) {
    setMateriasRaw(ms => ms.filter((_, i) => i !== idx))
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Equivalencias de Estudios</h1>
            <p className="text-sm text-slate-500 mt-1">Dictámenes de equivalencia para alumnos provenientes de IES externas al TecNM — Cap. 9</p>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            {showForm ? 'Cancelar' : '+ Registrar equivalencia'}
          </button>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-800">
          <strong>TecNM Cap. 9:</strong> La equivalencia aplica para alumnos provenientes de IES externas al TecNM. Se recalcula el semestre y los créditos acumulados del alumno.
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Nuevo Dictamen de Equivalencia</h2>
            <form onSubmit={e => { e.preventDefault(); crearMut.mutate() }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    placeholder="Universidad Veracruzana" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">URL dictamen (opcional)</label>
                  <input type="text" value={form.dictamen_url} onChange={e => setForm(f => ({ ...f, dictamen_url: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..." />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-600">Materias a equivalar</label>
                  <button type="button" onClick={addMateria}
                    className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                    + Agregar materia
                  </button>
                </div>
                <div className="space-y-2">
                  {materiasRaw.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                      <input type="text" value={m.clave} onChange={e => updateMateria(idx, 'clave', e.target.value)}
                        className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Clave" required />
                      <input type="text" value={m.nombre} onChange={e => updateMateria(idx, 'nombre', e.target.value)}
                        className="col-span-2 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nombre de la materia" required />
                      <input type="number" min={0} max={100} step={0.1} value={m.calificacion}
                        onChange={e => updateMateria(idx, 'calificacion', Number(e.target.value))}
                        className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Cal." required />
                      <div className="flex gap-1">
                        <input type="number" min={1} value={m.creditos}
                          onChange={e => updateMateria(idx, 'creditos', Number(e.target.value))}
                          className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Créd." required />
                        {materiasRaw.length > 1 && (
                          <button type="button" onClick={() => removeMateria(idx)}
                            className="text-red-500 hover:text-red-700 px-1">✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={crearMut.isPending}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {crearMut.isPending ? 'Guardando…' : 'Registrar equivalencia'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Dictámenes de equivalencia registrados</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-16 text-slate-400">Cargando...</div>
          ) : equivalencias.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <p className="font-medium">Sin equivalencias registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {equivalencias.map(eq => (
                <div key={eq.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-800">{eq.alumno?.name ?? eq.alumno_id}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Institución: {eq.institucion_origen}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {eq.materias_json?.length ?? 0} materia(s) •{' '}
                        {new Date(eq.created_at).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <button onClick={() => setExpanded(expanded === eq.id ? null : eq.id)}
                      className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors shrink-0">
                      {expanded === eq.id ? 'Ocultar' : 'Ver materias'}
                    </button>
                  </div>
                  {expanded === eq.id && eq.materias_json?.length > 0 && (
                    <table className="w-full mt-3 text-xs border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left py-2 px-3 font-semibold text-slate-600">Clave</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-600">Materia</th>
                          <th className="text-center py-2 px-3 font-semibold text-slate-600">Cal.</th>
                          <th className="text-center py-2 px-3 font-semibold text-slate-600">Créditos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eq.materias_json.map((m, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="py-1.5 px-3 text-slate-600">{m.clave}</td>
                            <td className="py-1.5 px-3 text-slate-800">{m.nombre}</td>
                            <td className="py-1.5 px-3 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                Number(m.calificacion) >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                              }`}>{m.calificacion}</span>
                            </td>
                            <td className="py-1.5 px-3 text-center text-slate-600">{m.creditos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
