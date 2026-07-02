import { useState, useEffect, useCallback } from 'react'
import { academicoApi } from '../services/academico'
import type { FichaSindical } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'

const TIPO_BADGE: Record<string, string> = {
  Base:         'bg-green-100 text-green-800',
  Interino:     'bg-yellow-100 text-yellow-800',
  'Hora-Clase': 'bg-indigo-100 text-indigo-800',
  'Medio-Tiempo': 'bg-pink-100 text-pink-800',
}

const TIPOS_NOMBRAMIENTO = ['Base', 'Interino', 'Hora-Clase', 'Medio-Tiempo'] as const
type TipoNombramiento = typeof TIPOS_NOMBRAMIENTO[number]

export default function FichasSindicalesPage() {
  const toast = useToastStore()
  const [fichas, setFichas] = useState<FichaSindical[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showMovForm, setShowMovForm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    docente_id: '',
    clave_plaza: '',
    tipo_nombramiento: 'Base' as TipoNombramiento,
    categoria_tbc: '',
    nivel_tbc: '',
    numero_issste: '',
    fecha_ingreso_sep: '',
    fecha_ingreso_tecnm: '',
  })

  const [movForm, setMovForm] = useState({
    tipo_movimiento: 'alta' as 'alta' | 'cambio_categoria' | 'baja' | 'reingreso',
    categoria_anterior: '',
    categoria_nueva: '',
    fecha_efectiva: '',
    notas: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await academicoApi.getPlazas(filtroTipo ? { tipo_nombramiento: filtroTipo } : undefined)
      setFichas(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Error al cargar catálogo de plazas')
    } finally {
      setLoading(false)
    }
  }, [toast, filtroTipo])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = await academicoApi.registrarFichaSindical(form.docente_id, {
        clave_plaza:         form.clave_plaza,
        tipo_nombramiento:   form.tipo_nombramiento,
        categoria_tbc:       form.categoria_tbc || undefined,
        nivel_tbc:           form.nivel_tbc || undefined,
        numero_issste:       form.numero_issste || undefined,
        fecha_ingreso_sep:   form.fecha_ingreso_sep,
        fecha_ingreso_tecnm: form.fecha_ingreso_tecnm || undefined,
      })
      if (data.alerta_fecha) {
        toast.error('Alerta: fecha_ingreso_sep es posterior a fecha_ingreso_tecnm — verifique los datos.')
      } else {
        toast.success('Ficha sindical registrada')
      }
      setShowForm(false)
      setForm({ docente_id: '', clave_plaza: '', tipo_nombramiento: 'Base', categoria_tbc: '', nivel_tbc: '', numero_issste: '', fecha_ingreso_sep: '', fecha_ingreso_tecnm: '' })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al registrar ficha sindical')
    } finally {
      setSaving(false)
    }
  }

  const handleMovimiento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showMovForm) return
    setSaving(true)
    try {
      await academicoApi.registrarMovimientoPlaza(showMovForm, {
        tipo_movimiento:    movForm.tipo_movimiento,
        categoria_anterior: movForm.categoria_anterior || undefined,
        categoria_nueva:    movForm.categoria_nueva || undefined,
        fecha_efectiva:     movForm.fecha_efectiva,
        notas:              movForm.notas || undefined,
      })
      toast.success('Movimiento registrado')
      setShowMovForm(null)
      setMovForm({ tipo_movimiento: 'alta', categoria_anterior: '', categoria_nueva: '', fecha_efectiva: '', notas: '' })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al registrar movimiento')
    } finally {
      setSaving(false)
    }
  }

  const descargarPDF = async () => {
    try {
      const blob = await academicoApi.descargarPlantillaSindical(filtroTipo ? { tipo_nombramiento: filtroTipo } : undefined)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla_docente_sindicalizada.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al generar el PDF')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Personal Sindicalizado</h1>
          <p className="text-sm text-gray-500 mt-1">Plazas docentes TecNM — Historial de movimientos inmutable</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={descargarPDF}
            className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 text-sm font-medium"
          >
            Descargar PDF TecNM
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Registrar ficha sindical
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 items-center">
        <span className="text-sm text-gray-500">Tipo nombramiento:</span>
        {['', ...TIPOS_NOMBRAMIENTO].map(t => (
          <button
            key={t || 'todos'}
            onClick={() => setFiltroTipo(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtroTipo === t
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t || 'Todos'}
          </button>
        ))}
      </div>

      {/* Modal nueva ficha */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrar ficha sindical</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Docente (UUID) *</label>
                <input type="text" value={form.docente_id}
                  onChange={e => setForm(f => ({ ...f, docente_id: e.target.value }))}
                  required placeholder="UUID del usuario docente"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clave plaza *</label>
                  <input type="text" value={form.clave_plaza}
                    onChange={e => setForm(f => ({ ...f, clave_plaza: e.target.value }))}
                    required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo nombramiento *</label>
                  <select value={form.tipo_nombramiento}
                    onChange={e => setForm(f => ({ ...f, tipo_nombramiento: e.target.value as TipoNombramiento }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {TIPOS_NOMBRAMIENTO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría TBC</label>
                  <input type="text" value={form.categoria_tbc}
                    onChange={e => setForm(f => ({ ...f, categoria_tbc: e.target.value }))}
                    placeholder="ej. PA"
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nivel TBC</label>
                  <input type="text" value={form.nivel_tbc}
                    onChange={e => setForm(f => ({ ...f, nivel_tbc: e.target.value }))}
                    placeholder="ej. 3C"
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N.° ISSSTE</label>
                <input type="text" value={form.numero_issste}
                  onChange={e => setForm(f => ({ ...f, numero_issste: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ingreso SEP *</label>
                  <input type="date" value={form.fecha_ingreso_sep}
                    onChange={e => setForm(f => ({ ...f, fecha_ingreso_sep: e.target.value }))}
                    required className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ingreso TecNM</label>
                  <input type="date" value={form.fecha_ingreso_tecnm}
                    onChange={e => setForm(f => ({ ...f, fecha_ingreso_tecnm: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
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

      {/* Modal movimiento */}
      {showMovForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrar movimiento de plaza</h2>
            <form onSubmit={handleMovimiento} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de movimiento *</label>
                <select value={movForm.tipo_movimiento}
                  onChange={e => setMovForm(f => ({ ...f, tipo_movimiento: e.target.value as typeof f.tipo_movimiento }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="alta">Alta</option>
                  <option value="cambio_categoria">Cambio de categoría</option>
                  <option value="baja">Baja</option>
                  <option value="reingreso">Reingreso</option>
                </select>
              </div>
              {movForm.tipo_movimiento === 'cambio_categoria' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría anterior</label>
                    <input type="text" value={movForm.categoria_anterior}
                      onChange={e => setMovForm(f => ({ ...f, categoria_anterior: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría nueva</label>
                    <input type="text" value={movForm.categoria_nueva}
                      onChange={e => setMovForm(f => ({ ...f, categoria_nueva: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha efectiva *</label>
                <input type="date" value={movForm.fecha_efectiva}
                  onChange={e => setMovForm(f => ({ ...f, fecha_efectiva: e.target.value }))}
                  required className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={movForm.notas}
                  onChange={e => setMovForm(f => ({ ...f, notas: e.target.value }))}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowMovForm(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
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
                {['Docente', 'Clave plaza', 'Nombramiento', 'Categoría / Nivel', 'Ingreso SEP', 'Años servicio', 'Movimientos', 'Acciones'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fichas.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Sin fichas sindicales registradas</td></tr>
              ) : fichas.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{f.docente?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{f.docente?.email}</p>
                  </td>
                  <td className="px-5 py-4 text-sm font-mono text-gray-700">{f.clave_plaza}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TIPO_BADGE[f.tipo_nombramiento] ?? 'bg-gray-100 text-gray-700'}`}>
                      {f.tipo_nombramiento}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    <span>{f.categoria_tbc ?? '—'}</span>
                    {f.nivel_tbc && <span className="text-gray-400"> / {f.nivel_tbc}</span>}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {f.fecha_ingreso_sep ? new Date(f.fecha_ingreso_sep).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-lg font-bold text-blue-700">{f.anios_servicio}</span>
                    <span className="text-xs text-gray-400 block">años</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm text-gray-600">{f.movimientos?.length ?? 0}</span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setShowMovForm(f.id)}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      + Movimiento
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
