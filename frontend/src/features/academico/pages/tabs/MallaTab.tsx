import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type MallaCurricular } from '../../services/academico'
import { Field, ModalWrap, Th, selectCls, useCarreras } from './shared'

export default function MallaTab() {
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

  const SEMESTRES = [1,2,3,4,5,6,7,8,9]

  const porSemestre = SEMESTRES.reduce((acc, s) => {
    acc[s] = (mallas as MallaCurricular[]).filter(m => m.semestre === s)
    return acc
  }, {} as Record<number, MallaCurricular[]>)

  return (
    <div className="space-y-4">
      {/* Filtro */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-slate-600 mb-1">Carrera</label>
          <select value={carreraId} onChange={e => setCarreraId(e.target.value)} className={selectCls}>
            <option value="">— Selecciona una carrera —</option>
            {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
          </select>
        </div>
        {carreraId && (
          <button
            onClick={() => { setForm({ carrera_id: carreraId, semestre: 1, es_especialidad: false }); setModal(true) }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >+ Añadir materia</button>
        )}
      </div>

      {!carreraId ? (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-400">
          Selecciona una carrera para ver su malla curricular.
        </div>
      ) : isLoading ? (
        <div className="text-center py-8 text-slate-400 text-sm">Cargando…</div>
      ) : (
        <div className="space-y-4">
          {SEMESTRES.filter(s => porSemestre[s]?.length > 0 || true).map(s => (
            porSemestre[s]?.length > 0 ? (
              <div key={s} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Semestre {s}</span>
                  <span className="text-xs text-slate-400">{porSemestre[s].length} materia(s)</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <Th>Clave</Th><Th>Clave TecNM</Th><Th>Nombre</Th><Th>Créditos</Th><Th>Tipo</Th><Th>Especialidad</Th><Th></Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {porSemestre[s].map(m => (
                      <tr key={m.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{m.materia?.clave}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{(m.materia as any)?.clave_oficial_tecnm ?? '—'}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{m.materia?.nombre}</td>
                        <td className="px-4 py-2.5 text-slate-600">{m.materia?.creditos}</td>
                        <td className="px-4 py-2.5 text-slate-500 capitalize">{m.materia?.tipo}</td>
                        <td className="px-4 py-2.5">
                          {m.es_especialidad && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Especialidad</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => { if (confirm('¿Retirar materia de la malla?')) mutDelete.mutate(m.id) }}
                            className="text-xs text-red-500 hover:underline"
                          >Retirar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null
          ))}
        </div>
      )}

      {modal && (
        <ModalWrap title="Añadir materia a la malla" onClose={() => setModal(false)} onSave={() => mutCreate.mutate(form as MallaCurricular)} saving={mutCreate.isPending}>
          <Field label="Materia *" full>
            <select value={form.materia_id ?? ''} onChange={e => set('materia_id', e.target.value)} className={selectCls}>
              <option value="">— Selecciona —</option>
              {materias.map(m => <option key={m.id} value={m.id}>{m.clave} — {m.nombre}</option>)}
            </select>
          </Field>
          <Field label="Semestre *">
            <select value={form.semestre ?? 1} onChange={e => set('semestre', +e.target.value)} className={selectCls}>
              {SEMESTRES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Es materia de especialidad">
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
