import { useState, useEffect, useCallback } from 'react'
import { academicoApi } from '../services/academico'
import type { ConvenioMovilidad } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'
import ViewToggle, { useViewMode } from '../../../components/ui/ViewToggle'
import DetailModal from '../../../components/ui/DetailModal'

const TIPOS: Record<string, string> = {
  tecnm: 'TecNM',
  nacional: 'Nacional',
  extranjera: 'Extranjera',
}

export default function ConveniosMovilidadPage() {
  const toast = useToastStore()
  const [convenios, setConvenios] = useState<ConvenioMovilidad[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre_institucion: '',
    tipo: 'tecnm' as 'tecnm' | 'nacional' | 'extranjera',
    vigente_desde: '',
    vigente_hasta: '',
    url_convenio: '',
  })
  const [vista, setVista] = useViewMode('convenios-movilidad')
  const [detalle, setDetalle] = useState<ConvenioMovilidad | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await academicoApi.getConveniosMovilidad()
      setConvenios(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Error al cargar convenios')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await academicoApi.crearConvenioMovilidad({
        nombre_institucion: form.nombre_institucion,
        tipo: form.tipo,
        vigente_desde: form.vigente_desde,
        vigente_hasta: form.vigente_hasta || undefined,
        url_convenio: form.url_convenio || undefined,
      })
      toast.success('Convenio registrado')
      setShowForm(false)
      setForm({ nombre_institucion: '', tipo: 'tecnm', vigente_desde: '', vigente_hasta: '', url_convenio: '' })
      load()
    } catch {
      toast.error('Error al registrar convenio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Convenios de Movilidad</h1>
          <p className="text-sm text-gray-500 mt-1">Instituciones nacionales e internacionales con convenio activo</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle value={vista} onChange={setVista} />
          <button
            onClick={() => setShowForm(true)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 text-sm font-medium"
          >
            + Nuevo convenio
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrar convenio</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Institución *</label>
                <input
                  type="text"
                  value={form.nombre_institucion}
                  onChange={e => setForm(f => ({ ...f, nombre_institucion: e.target.value }))}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'tecnm' | 'nacional' | 'extranjera' }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="tecnm">TecNM</option>
                  <option value="nacional">Nacional</option>
                  <option value="extranjera">Extranjera</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vigente desde *</label>
                  <input
                    type="date"
                    value={form.vigente_desde}
                    onChange={e => setForm(f => ({ ...f, vigente_desde: e.target.value }))}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vigente hasta</label>
                  <input
                    type="date"
                    value={form.vigente_hasta}
                    onChange={e => setForm(f => ({ ...f, vigente_hasta: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL convenio</label>
                <input
                  type="url"
                  value={form.url_convenio}
                  onChange={e => setForm(f => ({ ...f, url_convenio: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : convenios.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border text-center py-10 text-gray-400">Sin convenios registrados</div>
      ) : vista === 'lista' ? (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Institución', 'Tipo', 'Vigente desde', 'Vigente hasta', 'Estado', 'Convenio', ''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {convenios.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.nombre_institucion}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      c.tipo === 'tecnm' ? 'bg-brand-100 text-brand-800' :
                      c.tipo === 'nacional' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>{TIPOS[c.tipo]}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.vigente_desde}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.vigente_hasta ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      c.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>{c.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {c.url_convenio ? (
                      <a href={c.url_convenio} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                        Ver documento
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setDetalle(c)} className="text-xs font-medium text-brand-600 hover:underline whitespace-nowrap">Ver detalle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {convenios.map(c => (
            <div key={c.id} className="bg-white border rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-gray-900 truncate">{c.nombre_institucion}</p>
                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {c.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded font-medium self-start ${
                c.tipo === 'tecnm' ? 'bg-brand-100 text-brand-800' : c.tipo === 'nacional' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
              }`}>{TIPOS[c.tipo]}</span>
              <p className="text-xs text-gray-500">{c.vigente_desde} — {c.vigente_hasta ?? 'sin fin'}</p>
              <button onClick={() => setDetalle(c)} className="mt-1 text-xs font-medium text-brand-600 hover:underline self-start">Ver detalle</button>
            </div>
          ))}
        </div>
      )}

      {detalle && (
        <DetailModal
          title={detalle.nombre_institucion}
          onClose={() => setDetalle(null)}
          fields={[
            { label: 'Tipo', value: TIPOS[detalle.tipo] },
            { label: 'Vigente desde', value: detalle.vigente_desde },
            { label: 'Vigente hasta', value: detalle.vigente_hasta ?? 'Sin fecha de término' },
            { label: 'Estado', value: detalle.activo ? 'Activo' : 'Inactivo' },
            { label: 'Documento', value: detalle.url_convenio ? <a href={detalle.url_convenio} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Ver documento</a> : '—' },
          ]}
        />
      )}
    </div>
  )
}
