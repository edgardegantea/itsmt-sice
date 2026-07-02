import { useState, useEffect, useCallback } from 'react'
import { academicoApi } from '../services/academico'
import type { CursoVerano } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'

const ESTATUS_COLORS: Record<string, string> = {
  programado: 'bg-yellow-100 text-yellow-800',
  activo:     'bg-blue-100 text-blue-800',
  cerrado:    'bg-gray-100 text-gray-700',
  cancelado:  'bg-red-100 text-red-800',
}

export default function CursosVeranoPage() {
  const toast = useToastStore()
  const [cursos, setCursos] = useState<CursoVerano[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [inscribiendo, setInscribiendo] = useState<string | null>(null)

  const [form, setForm] = useState({
    periodo_padre_id: '',
    materia_id: '',
    docente_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    max_alumnos: '30',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await academicoApi.getCursosVerano()
      setCursos(res.data ?? [])
    } catch {
      toast.error('Error al cargar cursos de verano')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await academicoApi.programarCursoVerano({
        periodo_padre_id: form.periodo_padre_id,
        materia_id: form.materia_id,
        docente_id: form.docente_id,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || undefined,
        max_alumnos: parseInt(form.max_alumnos),
      })
      toast.success('Curso de verano programado')
      setShowForm(false)
      setForm({ periodo_padre_id: '', materia_id: '', docente_id: '', fecha_inicio: '', fecha_fin: '', max_alumnos: '30' })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al programar curso')
    } finally {
      setSaving(false)
    }
  }

  const handleInscribir = async (cursoId: string) => {
    setInscribiendo(cursoId)
    try {
      await academicoApi.inscribirCursoVerano(cursoId)
      toast.success('Inscripción registrada')
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al inscribirse')
    } finally {
      setInscribiendo(null)
    }
  }

  const handleCerrar = async (cursoId: string) => {
    if (!confirm('¿Cerrar este curso? Esta acción publicará calificaciones y no se puede deshacer.')) return
    try {
      await academicoApi.cerrarCursoVerano(cursoId)
      toast.success('Curso cerrado')
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al cerrar curso')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cursos de Verano</h1>
          <p className="text-sm text-gray-500 mt-1">TecNM Cap. 13 — Grupos de 15 a 30 alumnos, 6 semanas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Programar curso
        </button>
      </div>

      {/* Modal nuevo curso */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Programar curso de verano</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Período *</label>
                <input
                  type="text"
                  value={form.periodo_padre_id}
                  onChange={e => setForm(f => ({ ...f, periodo_padre_id: e.target.value }))}
                  required
                  placeholder="UUID del período"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Materia *</label>
                <input
                  type="text"
                  value={form.materia_id}
                  onChange={e => setForm(f => ({ ...f, materia_id: e.target.value }))}
                  required
                  placeholder="UUID de la materia"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Docente *</label>
                <input
                  type="text"
                  value={form.docente_id}
                  onChange={e => setForm(f => ({ ...f, docente_id: e.target.value }))}
                  required
                  placeholder="UUID del docente"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio *</label>
                  <input
                    type="date"
                    value={form.fecha_inicio}
                    onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
                  <input
                    type="date"
                    value={form.fecha_fin}
                    onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máx. alumnos (15–30) *</label>
                <input
                  type="number"
                  min={15}
                  max={30}
                  value={form.max_alumnos}
                  onChange={e => setForm(f => ({ ...f, max_alumnos: e.target.value }))}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Programar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cursos.length === 0 ? (
            <div className="col-span-3 text-center py-10 text-gray-400">Sin cursos de verano registrados</div>
          ) : cursos.map(c => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{c.materia?.nombre ?? 'Materia'}</p>
                  <p className="text-xs text-gray-500">{c.materia?.clave}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ESTATUS_COLORS[c.estatus]}`}>
                  {c.estatus.charAt(0).toUpperCase() + c.estatus.slice(1)}
                </span>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Docente</span>
                  <span>{c.docente?.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Período</span>
                  <span>{c.periodo?.nombre ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Inicio</span>
                  <span>{c.fecha_inicio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Inscriptos</span>
                  <span className="font-medium">{c.inscripciones_count ?? 0} / {c.max_alumnos}</span>
                </div>
              </div>

              {/* Barra de ocupación */}
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, ((c.inscripciones_count ?? 0) / c.max_alumnos) * 100)}%` }}
                />
              </div>

              <div className="flex gap-2 pt-1">
                {c.estatus === 'programado' || c.estatus === 'activo' ? (
                  <button
                    onClick={() => handleInscribir(c.id)}
                    disabled={inscribiendo === c.id}
                    className="flex-1 text-center text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg py-1.5 disabled:opacity-50"
                  >
                    {inscribiendo === c.id ? 'Inscribiendo...' : 'Inscribirse'}
                  </button>
                ) : null}
                {(c.estatus === 'activo' || c.estatus === 'programado') && (
                  <button
                    onClick={() => handleCerrar(c.id)}
                    className="flex-1 text-center text-sm bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg py-1.5"
                  >
                    Cerrar curso
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
