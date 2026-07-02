import { useState, useEffect, useCallback } from 'react'
import { academicoApi } from '../services/academico'
import type { MovilidadEstudiantil } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'

const ESTATUS_COLORS: Record<string, string> = {
  activa:    'bg-blue-100 text-blue-800',
  concluida: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
}

interface CalifForm {
  nombre: string
  tipo_acreditacion: 'numerica' | 'AC' | 'NA'
  calificacion: string
}

export default function MovilidadEstudiantilPage() {
  const toast = useToastStore()
  const [movilidades, setMovilidades] = useState<MovilidadEstudiantil[]>([])
  const [loading, setLoading] = useState(true)
  const [showSolicitud, setShowSolicitud] = useState(false)
  const [saving, setSaving] = useState(false)
  const [solicitudForm, setSolicitudForm] = useState({ ies_receptora: '', fecha_inicio: '', fecha_fin: '' })

  const [selectedMovilidad, setSelectedMovilidad] = useState<MovilidadEstudiantil | null>(null)
  const [materias, setMaterias] = useState<CalifForm[]>([{ nombre: '', tipo_acreditacion: 'numerica', calificacion: '' }])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await academicoApi.getMovilidadEstudiantil()
      setMovilidades(res.data ?? [])
    } catch {
      toast.error('Error al cargar movilidades')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const handleSolicitud = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await academicoApi.solicitarMovilidad({
        ies_receptora: solicitudForm.ies_receptora,
        fecha_inicio: solicitudForm.fecha_inicio,
        fecha_fin: solicitudForm.fecha_fin || undefined,
      })
      toast.success('Estancia de movilidad registrada')
      setShowSolicitud(false)
      setSolicitudForm({ ies_receptora: '', fecha_inicio: '', fecha_fin: '' })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al registrar movilidad')
    } finally {
      setSaving(false)
    }
  }

  const addMateria = () => setMaterias(m => [...m, { nombre: '', tipo_acreditacion: 'numerica', calificacion: '' }])
  const removeMateria = (i: number) => setMaterias(m => m.filter((_, idx) => idx !== i))

  const handleCalificaciones = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMovilidad) return
    setSaving(true)
    try {
      await academicoApi.registrarCalificacionesMovilidad(
        selectedMovilidad.id,
        materias.map(m => ({
          nombre: m.nombre,
          tipo_acreditacion: m.tipo_acreditacion,
          ...(m.tipo_acreditacion === 'numerica' ? { calificacion: parseFloat(m.calificacion) } : {}),
        }))
      )
      toast.success('Calificaciones de movilidad registradas')
      setSelectedMovilidad(null)
      setMaterias([{ nombre: '', tipo_acreditacion: 'numerica', calificacion: '' }])
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al registrar calificaciones')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movilidad Estudiantil</h1>
          <p className="text-sm text-gray-500 mt-1">TecNM Cap. 8 — Máximo 3 semestres en movilidad</p>
        </div>
        <button
          onClick={() => setShowSolicitud(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Solicitar movilidad
        </button>
      </div>

      {/* Modal solicitud */}
      {showSolicitud && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Solicitar estancia de movilidad</h2>
            <form onSubmit={handleSolicitud} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IES receptora *</label>
                <input
                  type="text"
                  value={solicitudForm.ies_receptora}
                  onChange={e => setSolicitudForm(f => ({ ...f, ies_receptora: e.target.value }))}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio *</label>
                  <input
                    type="date"
                    value={solicitudForm.fecha_inicio}
                    onChange={e => setSolicitudForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
                  <input
                    type="date"
                    value={solicitudForm.fecha_fin}
                    onChange={e => setSolicitudForm(f => ({ ...f, fecha_fin: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSolicitud(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal calificaciones */}
      {selectedMovilidad && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Registrar calificaciones de movilidad</h2>
            <p className="text-sm text-gray-500 mb-4">{selectedMovilidad.ies_receptora}</p>
            <form onSubmit={handleCalificaciones} className="space-y-3">
              {materias.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {i === 0 && <label className="block text-xs text-gray-600 mb-1">Materia *</label>}
                    <input
                      type="text"
                      value={m.nombre}
                      onChange={e => setMaterias(ms => ms.map((x, idx) => idx === i ? { ...x, nombre: e.target.value } : x))}
                      required
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    {i === 0 && <label className="block text-xs text-gray-600 mb-1">Acreditación *</label>}
                    <select
                      value={m.tipo_acreditacion}
                      onChange={e => setMaterias(ms => ms.map((x, idx) => idx === i ? { ...x, tipo_acreditacion: e.target.value as 'numerica' | 'AC' | 'NA' } : x))}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    >
                      <option value="numerica">Numérica</option>
                      <option value="AC">AC</option>
                      <option value="NA">NA</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    {i === 0 && <label className="block text-xs text-gray-600 mb-1">Calificación</label>}
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={m.calificacion}
                      onChange={e => setMaterias(ms => ms.map((x, idx) => idx === i ? { ...x, calificacion: e.target.value } : x))}
                      disabled={m.tipo_acreditacion !== 'numerica'}
                      required={m.tipo_acreditacion === 'numerica'}
                      className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {i > 0 && (
                      <button type="button" onClick={() => removeMateria(i)} className="text-red-500 hover:text-red-700 text-lg leading-none">×</button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addMateria} className="text-sm text-blue-600 hover:underline">+ Agregar materia</button>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setSelectedMovilidad(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Registrar calificaciones'}
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
                {['Alumno', 'IES receptora', 'Fecha inicio', 'Semestres', 'Estatus', 'Materias', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movilidades.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Sin registros de movilidad</td></tr>
              ) : movilidades.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 text-sm text-gray-900">{m.alumno?.name ?? '—'}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{m.ies_receptora}</td>
                  <td className="px-5 py-4 text-sm text-gray-500">{m.fecha_inicio}</td>
                  <td className="px-5 py-4 text-sm text-center">{m.semestres_acumulados_movilidad}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ESTATUS_COLORS[m.estatus]}`}>
                      {m.estatus.charAt(0).toUpperCase() + m.estatus.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    {m.materias_cursadas ? `${m.materias_cursadas.length} materia(s)` : '—'}
                  </td>
                  <td className="px-5 py-4">
                    {m.estatus === 'activa' && (
                      <button
                        onClick={() => {
                          setSelectedMovilidad(m)
                          setMaterias([{ nombre: '', tipo_acreditacion: 'numerica', calificacion: '' }])
                        }}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Registrar calificaciones
                      </button>
                    )}
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
