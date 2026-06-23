import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type CargaAcademica } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { Field, ModalWrap, Th, EmptyRow, icls, usePeriodos, mutationError, extractApiErrors } from './shared'

export default function CargasTab() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroDocente, setFiltroDocente] = useState('')
  const [modal, setModal] = useState<Partial<CargaAcademica> | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: periodos = [] } = usePeriodos()
  const { data: docentes = [] } = useQuery({ queryKey: ['docentes'], queryFn: academicoApi.getDocentes, staleTime: 60_000 })
  const { data: materias = [] } = useQuery({ queryKey: ['materias'], queryFn: () => academicoApi.getMaterias(), staleTime: 30_000 })
  const { data: grupos = [] } = useQuery({ queryKey: ['grupos'], queryFn: () => academicoApi.getGrupos(), staleTime: 30_000 })

  const { data: cargas = [], isLoading } = useQuery({
    queryKey: ['cargas', filtroPeriodo, filtroDocente],
    queryFn: () => {
      const p: Record<string, string> = {}
      if (filtroPeriodo) p.periodo_id = filtroPeriodo
      if (filtroDocente) p.docente_id = filtroDocente
      return academicoApi.getCargas(p)
    },
  })

  const save = useMutation({
    mutationFn: () => modal?.id ? academicoApi.updateCarga(modal.id!, modal) : academicoApi.createCarga(modal!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cargas'] }); addToast('Carga guardada.', 'success'); setModal(null); setErrors({}) },
    onError: (e) => {
      const extracted = extractApiErrors(e)
      if (Object.keys(extracted).length) setErrors(extracted)
      else addToast(mutationError(e), 'error')
    },
  })

  const del = useMutation({
    mutationFn: (id: string) => academicoApi.deleteCarga(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cargas'] }); addToast('Carga eliminada.', 'success') },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  const set = (k: keyof CargaAcademica, v: unknown) => setModal(m => ({ ...m, [k]: v }))

  // Resumen de horas por docente
  const horasPorDocente = cargas.reduce<Record<string, number>>((acc, c) => {
    acc[c.docente_id] = (acc[c.docente_id] ?? 0) + c.horas_semana
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
            <option value="">Todos los periodos</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filtroDocente} onChange={e => setFiltroDocente(e.target.value)}>
            <option value="">Todos los docentes</option>
            {docentes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button onClick={() => setModal({ horas_semana: 3 })}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <span className="text-base leading-none">+</span> Asignar carga
        </button>
      </div>

      {/* Resumen de carga total si hay filtro de docente */}
      {filtroDocente && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          Carga total del docente: <strong>{horasPorDocente[filtroDocente] ?? 0} horas/semana</strong>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr><Th>Docente</Th><Th>Materia</Th><Th>Grupo</Th><Th>Periodo</Th><Th>Horas/sem</Th><Th /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <EmptyRow cols={6} msg="Cargando…" />}
            {!isLoading && cargas.length === 0 && <EmptyRow cols={6} />}
            {cargas.map(c => (
              <tr key={c.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-medium text-slate-900">{c.docente?.name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-700">{c.materia?.nombre ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.grupo?.clave ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{c.periodo?.nombre ?? '—'}</td>
                <td className="px-4 py-3 text-center font-semibold text-slate-800">{c.horas_semana}h</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setModal(c)} className="text-xs text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => window.confirm('¿Eliminar carga?') && del.mutate(c.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <ModalWrap title={modal.id ? 'Editar carga' : 'Asignar carga académica'} onClose={() => { setModal(null); setErrors({}) }} onSave={() => save.mutate()} saving={save.isPending}>
          <Field label="Docente" full error={errors.docente_id}>
            <select className={icls(errors.docente_id)} value={modal.docente_id ?? ''} onChange={e => set('docente_id', e.target.value)}>
              <option value="">— Seleccionar docente —</option>
              {docentes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Materia / Asignatura" full error={errors.materia_id}>
            <select className={icls(errors.materia_id)} value={modal.materia_id ?? ''} onChange={e => set('materia_id', e.target.value)}>
              <option value="">— Seleccionar materia —</option>
              {materias.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.clave})</option>)}
            </select>
          </Field>
          <Field label="Grupo" error={errors.grupo_id}>
            <select className={icls(errors.grupo_id)} value={modal.grupo_id ?? ''} onChange={e => set('grupo_id', e.target.value)}>
              <option value="">— Seleccionar grupo —</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.clave} — {g.carrera?.clave}</option>)}
            </select>
          </Field>
          <Field label="Periodo" error={errors.periodo_id}>
            <select className={icls(errors.periodo_id)} value={modal.periodo_id ?? ''} onChange={e => set('periodo_id', e.target.value)}>
              <option value="">— Seleccionar periodo —</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Horas por semana" error={errors.horas_semana}>
            <input className={icls(errors.horas_semana)} type="number" min={1} max={40} value={modal.horas_semana ?? 3} onChange={e => set('horas_semana', Number(e.target.value))} />
          </Field>
        </ModalWrap>
      )}
    </div>
  )
}
