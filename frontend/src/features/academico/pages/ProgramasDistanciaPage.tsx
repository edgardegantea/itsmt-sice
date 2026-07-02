import { useState, useEffect, useCallback } from 'react'
import { academicoApi } from '../services/academico'
import type { ProgramaDistancia } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'

const MODALIDAD_LABEL: Record<string, string> = {
  no_escolarizada: 'No escolarizada',
  mixta:           'Mixta',
}

export default function ProgramasDistanciaPage() {
  const toast = useToastStore()
  const [programas, setProgramas] = useState<ProgramaDistancia[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    carrera_id: '',
    modalidad: 'mixta' as 'no_escolarizada' | 'mixta',
    creditos_minimos_carga: '12',
    creditos_maximos_carga: '36',
    semestres_maximos: '16',
    permite_trimestral: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await academicoApi.getProgramasDistancia()
      setProgramas(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Error al cargar programas a distancia')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await academicoApi.crearProgramaDistancia({
        carrera_id: form.carrera_id,
        modalidad: form.modalidad,
        creditos_minimos_carga: parseInt(form.creditos_minimos_carga),
        creditos_maximos_carga: parseInt(form.creditos_maximos_carga),
        semestres_maximos: parseInt(form.semestres_maximos),
        permite_trimestral: form.permite_trimestral,
      })
      toast.success('Programa a distancia configurado')
      setShowForm(false)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al configurar programa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programas a Distancia</h1>
          <p className="text-sm text-gray-500 mt-1">TecNM Cap. 16 — Modalidad no escolarizada y mixta</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Configurar programa
        </button>
      </div>

      {/* Compliance notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>TecNM Cap. 16:</strong> El aspirante debe acreditar el Módulo de Competencias para el Aprendizaje a Distancia antes de ser inscrito.
        Carga académica: 12–36 créditos. Tiempo máximo: 16 semestres (8 años).
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configurar programa a distancia</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Carrera *</label>
                <input
                  type="text"
                  value={form.carrera_id}
                  onChange={e => setForm(f => ({ ...f, carrera_id: e.target.value }))}
                  required
                  placeholder="UUID de la carrera"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad *</label>
                <select
                  value={form.modalidad}
                  onChange={e => setForm(f => ({ ...f, modalidad: e.target.value as 'no_escolarizada' | 'mixta' }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mixta">Mixta</option>
                  <option value="no_escolarizada">No escolarizada</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Créditos mínimos/período</label>
                  <input
                    type="number"
                    min={12}
                    max={36}
                    value={form.creditos_minimos_carga}
                    onChange={e => setForm(f => ({ ...f, creditos_minimos_carga: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Créditos máximos/período</label>
                  <input
                    type="number"
                    min={12}
                    max={36}
                    value={form.creditos_maximos_carga}
                    onChange={e => setForm(f => ({ ...f, creditos_maximos_carga: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semestres máximos (TecNM: 16)</label>
                <input
                  type="number"
                  min={8}
                  max={20}
                  value={form.semestres_maximos}
                  onChange={e => setForm(f => ({ ...f, semestres_maximos: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="trimestral"
                  checked={form.permite_trimestral}
                  onChange={e => setForm(f => ({ ...f, permite_trimestral: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="trimestral" className="text-sm text-gray-700">Permitir dosificación trimestral</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Configurar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Carrera', 'Modalidad', 'Créditos mín.', 'Créditos máx.', 'Sem. máx.', 'Trimestral', 'Estado'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {programas.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Sin programas a distancia configurados</td></tr>
              ) : programas.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.carrera?.nombre ?? p.carrera_id}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      p.modalidad === 'mixta' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
                    }`}>{MODALIDAD_LABEL[p.modalidad]}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">{p.creditos_minimos_carga}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">{p.creditos_maximos_carga}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">{p.semestres_maximos}</td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className={p.permite_trimestral ? 'text-green-600' : 'text-gray-400'}>
                      {p.permite_trimestral ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      p.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>{p.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
