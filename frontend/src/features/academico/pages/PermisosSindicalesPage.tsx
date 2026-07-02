import { useState, useEffect, useCallback } from 'react'
import { academicoApi } from '../services/academico'
import type { PermisoSindical } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'

const TIPO_LABEL: Record<string, string> = {
  comision_sindical:   'Comisión sindical',
  licencia_con_goce:   'Licencia con goce',
  licencia_sin_goce:   'Licencia sin goce',
}
const TIPO_BADGE: Record<string, string> = {
  comision_sindical:   'bg-blue-100 text-blue-800',
  licencia_con_goce:   'bg-green-100 text-green-800',
  licencia_sin_goce:   'bg-red-100 text-red-800',
}

type TipoPermiso = 'comision_sindical' | 'licencia_con_goce' | 'licencia_sin_goce'

export default function PermisosSindicalesPage() {
  const toast = useToastStore()
  const [permisos, setPermisos] = useState<PermisoSindical[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('')

  const [form, setForm] = useState({
    docente_id: '',
    tipo_permiso: 'comision_sindical' as TipoPermiso,
    fecha_inicio: '',
    fecha_fin: '',
    motivo: '',
    periodo_id: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await academicoApi.getPermisosSindicales(filtroTipo ? { tipo_permiso: filtroTipo } : undefined)
      setPermisos(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Error al cargar permisos sindicales')
    } finally {
      setLoading(false)
    }
  }, [toast, filtroTipo])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await academicoApi.registrarPermisoSindical({
        docente_id:   form.docente_id,
        tipo_permiso: form.tipo_permiso,
        fecha_inicio: form.fecha_inicio,
        fecha_fin:    form.fecha_fin,
        motivo:       form.motivo,
        periodo_id:   form.periodo_id || undefined,
      })
      toast.success('Permiso sindical registrado')
      setShowForm(false)
      setForm({ docente_id: '', tipo_permiso: 'comision_sindical', fecha_inicio: '', fecha_fin: '', motivo: '', periodo_id: '' })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al registrar permiso sindical')
    } finally {
      setSaving(false)
    }
  }

  const descargarOficio = (permisoId: string) => {
    window.open(academicoApi.oficioPdfUrl(permisoId), '_blank')
  }

  const diasDesde = (fechaInicio: string, fechaFin: string) => {
    const d = Math.round((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / 86400000) + 1
    return d > 0 ? d : 0
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permisos Sindicales</h1>
          <p className="text-sm text-gray-500 mt-1">Diferenciados de permisos institucionales (S10) — SNTE / STIJNM</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Registrar permiso
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 items-center">
        {[{ key: '', label: 'Todos' }, ...Object.entries(TIPO_LABEL).map(([k, v]) => ({ key: k, label: v }))].map(({ key, label }) => (
          <button
            key={key || 'todos'}
            onClick={() => setFiltroTipo(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtroTipo === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrar permiso sindical</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Docente (UUID) *</label>
                <input type="text" value={form.docente_id}
                  onChange={e => setForm(f => ({ ...f, docente_id: e.target.value }))}
                  required placeholder="UUID del docente"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de permiso *</label>
                <select value={form.tipo_permiso}
                  onChange={e => setForm(f => ({ ...f, tipo_permiso: e.target.value as TipoPermiso }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio *</label>
                  <input type="date" value={form.fecha_inicio}
                    onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                    required className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin *</label>
                  <input type="date" value={form.fecha_fin}
                    onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                    required className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              {form.fecha_inicio && form.fecha_fin && (
                <p className="text-xs text-blue-600">
                  Días totales: <strong>{diasDesde(form.fecha_inicio, form.fecha_fin)}</strong>
                  {form.tipo_permiso === 'licencia_sin_goce' && <span className="ml-2 text-red-600">⚠ Sin goce de sueldo</span>}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
                <textarea value={form.motivo}
                  onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                  required rows={3}
                  placeholder="Describe la actividad sindical..."
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Período (opcional)</label>
                <input type="text" value={form.periodo_id}
                  onChange={e => setForm(f => ({ ...f, periodo_id: e.target.value }))}
                  placeholder="UUID del período"
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Registrar'}
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
                {['Docente', 'Tipo permiso', 'Período', 'Días', 'Goce', 'Oficio', 'Acciones'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {permisos.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Sin permisos sindicales registrados</td></tr>
              ) : permisos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{p.docente?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{p.docente?.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TIPO_BADGE[p.tipo_permiso] ?? 'bg-gray-100 text-gray-700'}`}>
                      {TIPO_LABEL[p.tipo_permiso]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    <p>{new Date(p.fecha_inicio).toLocaleDateString('es-MX')}</p>
                    <p className="text-xs text-gray-400">al {new Date(p.fecha_fin).toLocaleDateString('es-MX')}</p>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-lg font-bold text-blue-700">{p.dias_totales}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium ${p.con_goce_sueldo ? 'text-green-600' : 'text-red-600'}`}>
                      {p.con_goce_sueldo ? 'Con goce' : 'Sin goce'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs ${p.oficio_generado ? 'text-green-600' : 'text-gray-400'}`}>
                      {p.oficio_generado ? 'Generado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => descargarOficio(p.id)}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Oficio PDF
                    </button>
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
