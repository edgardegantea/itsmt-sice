import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { planeacionApi, type AsignacionDocente } from '../services/planeacion'

const ESTATUS_COLOR: Record<string, string> = {
  borrador:     'bg-slate-100 text-slate-600',
  enviada:      'bg-blue-100 text-blue-700',
  observaciones:'bg-yellow-100 text-yellow-700',
  liberada:     'bg-green-100 text-green-700',
  vigente:      'bg-emerald-100 text-emerald-700',
}

function Badge({ estatus }: { estatus?: string }) {
  if (!estatus) return null
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
      {estatus}
    </span>
  )
}

export default function AsignacionesDocentesPage() {
  const qc = useQueryClient()
  const [carreraId, setCarreraId] = useState('')
  const [periodoId, setPeriodoId] = useState('')
  const [docenteId, setDocenteId] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({
    docente_id: '', materia_id: '', carrera_id: '', periodo_id: '', grupo_id: '', horas_semana: 5,
  })
  const [editId, setEditId] = useState<string | null>(null)
  const [editHoras, setEditHoras] = useState(5)

  const params: Record<string, string> = {}
  if (carreraId) params.carrera_id = carreraId
  if (periodoId) params.periodo_id = periodoId
  if (docenteId) params.docente_id = docenteId

  const { data: asignaciones = [], isLoading } = useQuery({
    queryKey: ['asignaciones-docentes', params],
    queryFn: () => planeacionApi.getAsignaciones(params),
  })

  const crear = useMutation({
    mutationFn: () => planeacionApi.crearAsignacion({
      ...form,
      grupo_id: form.grupo_id || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones-docentes'] })
      setModal(false)
      setForm({ docente_id: '', materia_id: '', carrera_id: '', periodo_id: '', grupo_id: '', horas_semana: 5 })
    },
  })

  const actualizar = useMutation({
    mutationFn: (id: string) => planeacionApi.actualizarAsignacion(id, { horas_semana: editHoras }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asignaciones-docentes'] })
      setEditId(null)
    },
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asignaciones Docentes</h1>
          <p className="text-sm text-slate-500 mt-1">TecNM-AC-PO-003 — Gestión del Curso (Paso 1)</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nueva asignación
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          placeholder="ID Carrera"
          value={carreraId}
          onChange={e => setCarreraId(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          placeholder="ID Periodo"
          value={periodoId}
          onChange={e => setPeriodoId(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          placeholder="ID Docente"
          value={docenteId}
          onChange={e => setDocenteId(e.target.value)}
        />
        <button
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200"
          onClick={() => { setCarreraId(''); setPeriodoId(''); setDocenteId('') }}
        >
          Limpiar
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              {['Docente', 'Materia', 'Carrera', 'Periodo', 'Grupo', 'Hrs/sem', 'Instrumentación', 'Acciones'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-400">Cargando...</td></tr>
            )}
            {!isLoading && asignaciones.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-400">Sin asignaciones registradas</td></tr>
            )}
            {asignaciones.map((a: AsignacionDocente) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-sm font-medium text-slate-800">{a.docente?.name ?? '—'}</td>
                <td className="px-3 py-2 text-sm text-slate-600">{a.materia?.nombre ?? '—'}</td>
                <td className="px-3 py-2 text-sm text-slate-600">{a.carrera?.clave ?? '—'}</td>
                <td className="px-3 py-2 text-sm text-slate-600">{a.periodo?.nombre ?? '—'}</td>
                <td className="px-3 py-2 text-sm text-slate-600">{a.grupo?.clave ?? '—'}</td>
                <td className="px-3 py-2 text-sm text-slate-600">
                  {editId === a.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={1} max={40}
                        value={editHoras}
                        onChange={e => setEditHoras(Number(e.target.value))}
                        className="w-16 rounded border border-slate-300 px-2 py-0.5 text-sm"
                      />
                      <button
                        onClick={() => actualizar.mutate(a.id)}
                        className="rounded bg-green-600 px-2 py-0.5 text-xs text-white"
                      >✓</button>
                      <button onClick={() => setEditId(null)} className="text-slate-400 text-xs">✕</button>
                    </div>
                  ) : (
                    a.horas_semana
                  )}
                </td>
                <td className="px-3 py-2 text-sm">
                  <Badge estatus={a.instrumentacion?.estatus} />
                </td>
                <td className="px-3 py-2 text-sm">
                  <button
                    onClick={() => { setEditId(a.id); setEditHoras(a.horas_semana) }}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    Editar horas
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nueva asignación */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-slate-800">Nueva Asignación</h2>
            <div className="space-y-3">
              {(
                [
                  ['docente_id', 'UUID Docente'],
                  ['materia_id', 'UUID Materia'],
                  ['carrera_id', 'UUID Carrera'],
                  ['periodo_id', 'UUID Periodo'],
                  ['grupo_id',   'UUID Grupo (opcional)'],
                ] as [keyof typeof form, string][]
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    value={form[key] as string}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={label}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Horas / semana</label>
                <input
                  type="number" min={1} max={40}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  value={form.horas_semana}
                  onChange={e => setForm(f => ({ ...f, horas_semana: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button
                onClick={() => crear.mutate()}
                disabled={crear.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {crear.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
            {crear.isError && (
              <p className="mt-2 text-xs text-red-600">
                {(crear.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
