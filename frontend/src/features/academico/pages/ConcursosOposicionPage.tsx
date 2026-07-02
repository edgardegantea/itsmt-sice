import { useState, useEffect, useCallback } from 'react'
import { academicoApi } from '../services/academico'
import type { ConcursoOposicion } from '../services/academico'
import { useToastStore } from '../../../store/toastStore'

const RESULTADO_BADGE: Record<string, string> = {
  promovido:    'bg-green-100 text-green-800',
  no_promovido: 'bg-red-100 text-red-800',
  pendiente:    'bg-yellow-100 text-yellow-800',
}

interface ParticipanteForm {
  docente_id: string
  puntaje_obtenido: string
  resultado: 'promovido' | 'no_promovido' | 'pendiente'
  categoria_nueva: string
}

export default function ConcursosOposicionPage() {
  const toast = useToastStore()
  const [concursos, setConcursos] = useState<ConcursoOposicion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [form, setForm] = useState({
    nombre: '',
    fecha_realizacion: '',
    descripcion: '',
  })
  const [participantes, setParticipantes] = useState<ParticipanteForm[]>([
    { docente_id: '', puntaje_obtenido: '', resultado: 'pendiente', categoria_nueva: '' },
  ])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await academicoApi.getConcursosOposicion()
      setConcursos(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Error al cargar concursos de oposición')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const addParticipante = () =>
    setParticipantes(p => [...p, { docente_id: '', puntaje_obtenido: '', resultado: 'pendiente', categoria_nueva: '' }])

  const removeParticipante = (i: number) =>
    setParticipantes(p => p.filter((_, idx) => idx !== i))

  const updateParticipante = (i: number, field: keyof ParticipanteForm, value: string) =>
    setParticipantes(p => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        nombre:            form.nombre,
        fecha_realizacion: form.fecha_realizacion,
        descripcion:       form.descripcion || undefined,
        participantes: participantes
          .filter(p => p.docente_id.trim())
          .map(p => ({
            docente_id:       p.docente_id,
            puntaje_obtenido: p.puntaje_obtenido ? parseFloat(p.puntaje_obtenido) : undefined,
            resultado:        p.resultado,
            categoria_nueva:  p.categoria_nueva || undefined,
          })),
      }

      const promovidos = payload.participantes?.filter(p => p.resultado === 'promovido').length ?? 0
      await academicoApi.registrarConcursoOposicion(payload)

      toast.success(
        promovidos > 0
          ? `Concurso registrado. ${promovidos} docente(s) promovido(s) — movimiento de plaza generado automáticamente.`
          : 'Concurso de oposición registrado'
      )
      setShowForm(false)
      setForm({ nombre: '', fecha_realizacion: '', descripcion: '' })
      setParticipantes([{ docente_id: '', puntaje_obtenido: '', resultado: 'pendiente', categoria_nueva: '' }])
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al registrar concurso')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Concursos de Oposición</h1>
          <p className="text-sm text-gray-500 mt-1">Promociones escalafonarias — resultado promovido genera movimiento de plaza automáticamente</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Registrar concurso
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrar concurso de oposición</h2>

            {/* Aviso */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-4">
              Si un participante queda como <strong>promovido</strong>, el sistema creará automáticamente
              un movimiento de plaza de tipo <em>cambio_categoria</em> en su ficha sindical.
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del concurso *</label>
                <input type="text" value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de realización *</label>
                <input type="date" value={form.fecha_realizacion}
                  onChange={e => setForm(f => ({ ...f, fecha_realizacion: e.target.value }))}
                  required className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              </div>

              {/* Participantes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Participantes</label>
                  <button type="button" onClick={addParticipante}
                    className="text-xs text-blue-600 hover:underline">+ Agregar participante</button>
                </div>
                {participantes.map((p, i) => (
                  <div key={i} className="border rounded-lg p-3 mb-2 bg-gray-50 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-0.5">ID Docente (UUID)</label>
                        <input type="text" value={p.docente_id}
                          onChange={e => updateParticipante(i, 'docente_id', e.target.value)}
                          placeholder="UUID"
                          className="w-full border rounded px-2 py-1 text-sm" />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs text-gray-500 mb-0.5">Puntaje</label>
                        <input type="number" min={0} max={10} step={0.01} value={p.puntaje_obtenido}
                          onChange={e => updateParticipante(i, 'puntaje_obtenido', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm" />
                      </div>
                      <div className="w-36">
                        <label className="block text-xs text-gray-500 mb-0.5">Resultado</label>
                        <select value={p.resultado}
                          onChange={e => updateParticipante(i, 'resultado', e.target.value as ParticipanteForm['resultado'])}
                          className="w-full border rounded px-2 py-1 text-sm">
                          <option value="pendiente">Pendiente</option>
                          <option value="promovido">Promovido</option>
                          <option value="no_promovido">No promovido</option>
                        </select>
                      </div>
                      {participantes.length > 1 && (
                        <button type="button" onClick={() => removeParticipante(i)}
                          className="text-red-400 hover:text-red-600 text-xs mt-4">✕</button>
                      )}
                    </div>
                    {p.resultado === 'promovido' && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Nueva categoría TBC (ej. PB)</label>
                        <input type="text" value={p.categoria_nueva}
                          onChange={e => updateParticipante(i, 'categoria_nueva', e.target.value)}
                          placeholder="ej. PB"
                          className="w-40 border rounded px-2 py-1 text-sm" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Registrar concurso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {concursos.length === 0 ? (
            <div className="bg-white rounded-xl border p-10 text-center text-gray-400">Sin concursos de oposición registrados</div>
          ) : concursos.map(c => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{c.nombre}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(c.fecha_realizacion).toLocaleDateString('es-MX')}
                    {c.convocadoPor && ` — Convocado por ${c.convocadoPor.name}`}
                    {c.participantes && ` — ${c.participantes.length} participante(s)`}
                  </p>
                </div>
                <span className="text-gray-400 text-sm">{expandedId === c.id ? '▲' : '▼'}</span>
              </button>

              {expandedId === c.id && (
                <div className="border-t px-5 py-4">
                  {c.descripcion && <p className="text-sm text-gray-600 mb-3">{c.descripcion}</p>}
                  {c.participantes && c.participantes.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Docente</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Puntaje</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Resultado</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">Plaza generada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {c.participantes.map(p => (
                          <tr key={p.id}>
                            <td className="px-3 py-2">{p.docente?.name ?? p.docente_id}</td>
                            <td className="px-3 py-2">{p.puntaje_obtenido ?? '—'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${RESULTADO_BADGE[p.resultado] ?? ''}`}>
                                {p.resultado === 'promovido' ? 'Promovido' : p.resultado === 'no_promovido' ? 'No promovido' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {p.movimiento_plaza_id
                                ? <span className="text-green-600 text-xs">✓ Movimiento generado</span>
                                : <span className="text-gray-400 text-xs">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-gray-400">Sin participantes registrados</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
