import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type Materia } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { Field, ModalWrap, Th, EmptyRow, icls,  useCarreras, mutationError, extractApiErrors } from './shared'

const TIPO_LABEL: Record<string, string> = {
  obligatoria: 'Obligatoria', optativa: 'Optativa',
}

const BLANK: Partial<Materia> = {
  clave: '', clave_oficial_tecnm: '', nombre: '', semestre: 1, creditos: 5,
  horas_teoria: 3, horas_practica: 2, tipo: 'obligatoria',
}

export default function MateriasTab() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [filtroSemestre, setFiltroSemestre] = useState('')
  const [modal, setModal] = useState<Partial<Materia> | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: carreras = [] } = useCarreras()
  const { data: materias = [], isLoading } = useQuery({
    queryKey: ['materias', filtroCarrera, filtroSemestre],
    queryFn: () => {
      const p: Record<string, string> = {}
      if (filtroCarrera)   p.carrera_id = filtroCarrera
      if (filtroSemestre)  p.semestre   = filtroSemestre
      return academicoApi.getMaterias(p)
    },
  })

  const save = useMutation({
    mutationFn: () => modal?.id
      ? academicoApi.updateMateria(modal.id!, modal)
      : academicoApi.createMateria({ ...modal, carrera_id: modal?.carrera_id ?? filtroCarrera }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materias'] }); addToast('Materia guardada.', 'success'); setModal(null); setErrors({}) },
    onError: (e) => {
      const extracted = extractApiErrors(e)
      if (Object.keys(extracted).length) setErrors(extracted)
      else addToast(mutationError(e), 'error')
    },
  })

  const del = useMutation({
    mutationFn: (id: string) => academicoApi.deleteMateria(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materias'] }); addToast('Materia eliminada.', 'success') },
    onError:   (e) => addToast(mutationError(e), 'error'),
  })

  const set = (k: keyof Materia, v: unknown) => setModal(m => ({ ...m, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)}>
            <option value="">Todas las carreras</option>
            {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filtroSemestre} onChange={e => setFiltroSemestre(e.target.value)}>
            <option value="">Todos los semestres</option>
            {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>{s}° semestre</option>)}
          </select>
        </div>
        <button onClick={() => setModal({ ...BLANK, carrera_id: filtroCarrera })}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <span className="text-base leading-none">+</span> Nueva materia
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr><Th>Clave</Th><Th>Nombre</Th><Th>Carrera</Th><Th>Sem.</Th><Th>Cred.</Th><Th>H. T / P</Th><Th>Tipo</Th><Th /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <EmptyRow cols={8} msg="Cargando…" />}
            {!isLoading && materias.length === 0 && <EmptyRow cols={8} />}
            {materias.map(m => (
              <tr key={m.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{m.clave}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{m.nombre}</td>
                <td className="px-4 py-3 text-slate-600">{m.carrera?.clave ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600 text-center">{m.semestre}</td>
                <td className="px-4 py-3 text-slate-600 text-center">{m.creditos}</td>
                <td className="px-4 py-3 text-slate-600 text-center">{m.horas_teoria} / {m.horas_practica}</td>
                <td className="px-4 py-3"><span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{TIPO_LABEL[m.tipo]}</span></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setModal(m)} className="text-xs text-blue-600 hover:underline mr-3">Editar</button>
                  <button onClick={() => window.confirm('¿Eliminar materia?') && del.mutate(m.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <ModalWrap title={modal.id ? 'Editar materia' : 'Nueva materia'} onClose={() => { setModal(null); setErrors({}) }} onSave={() => save.mutate()} saving={save.isPending}>
          <Field label="Carrera" error={errors.carrera_id}>
            <select className={icls(errors.carrera_id)} value={modal.carrera_id ?? ''} onChange={e => set('carrera_id', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Clave interna" error={errors.clave}>
            <input className={icls(errors.clave)} value={modal.clave ?? ''} onChange={e => set('clave', e.target.value.toUpperCase())} placeholder="p.e. ISC-101" />
          </Field>
          <Field label="Clave TecNM" error={errors.clave_oficial_tecnm}>
            <input className={icls(errors.clave_oficial_tecnm)} value={modal.clave_oficial_tecnm ?? ''} onChange={e => set('clave_oficial_tecnm', e.target.value.toUpperCase())} placeholder="p.e. AEC-1021" />
          </Field>
          <Field label="Nombre" full error={errors.nombre}>
            <input className={icls(errors.nombre)} value={modal.nombre ?? ''} onChange={e => set('nombre', e.target.value)} placeholder="Cálculo Diferencial e Integral" />
          </Field>
          <Field label="Semestre" error={errors.semestre}>
            <select className={icls(errors.semestre)} value={modal.semestre ?? 1} onChange={e => set('semestre', Number(e.target.value))}>
              {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>{s}°</option>)}
            </select>
          </Field>
          <Field label="Tipo" error={errors.tipo}>
            <select className={icls(errors.tipo)} value={modal.tipo ?? 'obligatoria'} onChange={e => set('tipo', e.target.value)}>
              {Object.entries(TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Créditos" error={errors.creditos}>
            <input className={icls(errors.creditos)} type="number" min={0} value={modal.creditos ?? 0} onChange={e => set('creditos', Number(e.target.value))} />
          </Field>
          <Field label="Horas teoría / semana" error={errors.horas_teoria}>
            <input className={icls(errors.horas_teoria)} type="number" min={0} value={modal.horas_teoria ?? 0} onChange={e => set('horas_teoria', Number(e.target.value))} />
          </Field>
          <Field label="Horas práctica / semana" error={errors.horas_practica}>
            <input className={icls(errors.horas_practica)} type="number" min={0} value={modal.horas_practica ?? 0} onChange={e => set('horas_practica', Number(e.target.value))} />
          </Field>
        </ModalWrap>
      )}
    </div>
  )
}
