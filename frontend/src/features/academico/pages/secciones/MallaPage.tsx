import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type MallaCurricular } from '../../services/academico'
import { Field, Th, selectCls, ModalWrap, useCarreras } from '../tabs/shared'

const SEMESTRES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export default function MallaPage() {
  const qc = useQueryClient()
  const { data: carreras = [] } = useCarreras()
  const [carreraId, setCarreraId] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<MallaCurricular>>({ semestre: 1, es_especialidad: false })
  const set = (k: keyof MallaCurricular, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const { data: materias = [] } = useQuery({
    queryKey: ['materias-select', carreraId],
    queryFn: () => academicoApi.getMaterias(carreraId ? { carrera_id: carreraId } : undefined),
    staleTime: 30_000,
  })

  const { data: mallas = [], isLoading } = useQuery({
    queryKey: ['mallas', carreraId],
    queryFn: () => academicoApi.getMallas(carreraId ? { carrera_id: carreraId } : {}),
    enabled: !!carreraId,
  })

  const mutCreate = useMutation({
    mutationFn: academicoApi.createMalla,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mallas'] }); setModal(false) },
  })

  const mutDelete = useMutation({
    mutationFn: academicoApi.deleteMalla,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mallas'] }),
  })

  const porSemestre = SEMESTRES.reduce((acc, s) => {
    acc[s] = (mallas as MallaCurricular[]).filter(m => m.semestre === s)
    return acc
  }, {} as Record<number, MallaCurricular[]>)

  const totalCreditos = (mallas as MallaCurricular[]).reduce((sum, m) => sum + (m.materia?.creditos ?? 0), 0)
  const carreraActual = carreras.find(c => c.id === carreraId)

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Gestión Académica
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Malla Curricular</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {carreraActual ? `${carreraActual.clave} — ${carreraActual.nombre}` : 'Distribución de materias por semestre'}
              </p>
            </div>
            {carreraId && (
              <button
                onClick={() => { setForm({ carrera_id: carreraId, semestre: 1, es_especialidad: false }); setModal(true) }}
                className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                + Añadir materia
              </button>
            )}
          </div>
        </div>

        {/* Selector de carrera + stats */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-64">
            <label className="block text-xs font-medium text-slate-600 mb-1">Carrera</label>
            <select value={carreraId} onChange={e => setCarreraId(e.target.value)} className={selectCls}>
              <option value="">— Selecciona una carrera —</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
            </select>
          </div>
          {carreraId && (mallas as MallaCurricular[]).length > 0 && (
            <div className="flex gap-4 text-sm text-slate-600 pb-0.5">
              <span><strong className="text-slate-900">{(mallas as MallaCurricular[]).length}</strong> materias</span>
              <span><strong className="text-slate-900">{totalCreditos}</strong> créditos totales</span>
            </div>
          )}
        </div>

        {!carreraId ? (
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-16 text-center">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm text-slate-400">Selecciona una carrera para ver su malla curricular.</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Cargando malla…</div>
        ) : (
          <div className="space-y-4">
            {SEMESTRES.map(s =>
              porSemestre[s]?.length > 0 ? (
                <div key={s} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{s}</span>
                      <span className="text-sm font-semibold text-slate-700">Semestre {s}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{porSemestre[s].length} materias</span>
                      <span>{porSemestre[s].reduce((sum, m) => sum + (m.materia?.creditos ?? 0), 0)} créditos</span>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <Th>Clave</Th><Th>Clave TecNM</Th><Th>Nombre</Th><Th>Créditos</Th><Th>Tipo</Th><Th>Especialidad</Th><Th />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {porSemestre[s].map(m => (
                        <tr key={m.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{m.materia?.clave}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{m.materia?.clave_oficial_tecnm ?? '—'}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-800">{m.materia?.nombre}</td>
                          <td className="px-4 py-2.5 text-center text-slate-600">{m.materia?.creditos}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${m.materia?.tipo === 'obligatoria' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                              {m.materia?.tipo === 'obligatoria' ? 'Obligatoria' : 'Optativa'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {m.es_especialidad && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Especialidad</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => { if (confirm('¿Retirar materia de la malla?')) mutDelete.mutate(m.id) }}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Retirar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null
            )}
            {(mallas as MallaCurricular[]).length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-400">
                Esta carrera aún no tiene materias en su malla.
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <ModalWrap
          title="Añadir materia a la malla"
          onClose={() => setModal(false)}
          onSave={() => mutCreate.mutate(form as MallaCurricular)}
          saving={mutCreate.isPending}
        >
          <Field label="Materia *" full>
            <select value={form.materia_id ?? ''} onChange={e => set('materia_id', e.target.value)} className={selectCls}>
              <option value="">— Selecciona —</option>
              {(materias as { id: string; clave: string; nombre: string }[]).map(m => (
                <option key={m.id} value={m.id}>{m.clave} — {m.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Semestre *">
            <select value={form.semestre ?? 1} onChange={e => set('semestre', +e.target.value)} className={selectCls}>
              {SEMESTRES.map(s => <option key={s} value={s}>{s}°</option>)}
            </select>
          </Field>
          <Field label="Es materia de especialidad" full>
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={!!form.es_especialidad} onChange={e => set('es_especialidad', e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-slate-700">Marcar como especialidad</span>
            </label>
          </Field>
        </ModalWrap>
      )}
    </div>
  )
}
