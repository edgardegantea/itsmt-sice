import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type CargaAcademica } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { Field, Th, EmptyRow, icls, selectCls, ModalWrap, usePeriodos, mutationError, extractApiErrors } from '../tabs/shared'

export default function CargasPage() {
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

  const totalHoras = (cargas as CargaAcademica[]).reduce((sum, c) => sum + c.horas_semana, 0)
  const docentesActivos = new Set((cargas as CargaAcademica[]).map(c => c.docente_id)).size
  const horasDocente = filtroDocente
    ? (cargas as CargaAcademica[]).reduce((sum, c) => c.docente_id === filtroDocente ? sum + c.horas_semana : sum, 0)
    : null

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
              <h1 className="text-xl font-bold text-slate-900">Cargas Académicas</h1>
              <p className="text-sm text-slate-500 mt-0.5">Asignación de materias y grupos a docentes por periodo</p>
            </div>
            <button
              onClick={() => setModal({ horas_semana: 3 })}
              className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              + Asignar carga
            </button>
          </div>
        </div>

        {/* Stats */}
        {(cargas as CargaAcademica[]).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">Total cargas</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{(cargas as CargaAcademica[]).length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">Horas / semana</p>
              <p className="text-2xl font-bold text-blue-700 mt-0.5">{totalHoras}h</p>
            </div>
            {horasDocente !== null ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-xs text-blue-600">Carga del docente seleccionado</p>
                <p className="text-2xl font-bold text-blue-900 mt-0.5">{horasDocente}h / sem</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">Docentes con carga</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{docentesActivos}</p>
              </div>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-44">
            <label className="block text-xs font-medium text-slate-600 mb-1">Periodo</label>
            <select className={selectCls} value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
              <option value="">Todos los periodos</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-44">
            <label className="block text-xs font-medium text-slate-600 mb-1">Docente</label>
            <select className={selectCls} value={filtroDocente} onChange={e => setFiltroDocente(e.target.value)}>
              <option value="">Todos los docentes</option>
              {docentes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Docente</Th>
                <Th>Materia</Th>
                <Th>Grupo</Th>
                <Th>Periodo</Th>
                <Th>Horas/sem</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && <EmptyRow cols={6} msg="Cargando…" />}
              {!isLoading && (cargas as CargaAcademica[]).length === 0 && <EmptyRow cols={6} />}
              {(cargas as CargaAcademica[]).map(c => (
                <tr key={c.id} className="hover:bg-blue-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{c.docente?.name ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.materia?.nombre ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{c.grupo?.clave ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{c.periodo?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-slate-900">{c.horas_semana}</span>
                    <span className="text-slate-400 text-xs">h</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => setModal(c)} className="text-xs text-blue-600 hover:underline">Editar</button>
                    <button onClick={() => window.confirm('¿Eliminar carga?') && del.mutate(c.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && (
        <ModalWrap
          title={modal.id ? 'Editar carga' : 'Asignar carga académica'}
          onClose={() => { setModal(null); setErrors({}) }}
          onSave={() => save.mutate()}
          saving={save.isPending}
        >
          <Field label="Docente *" full error={errors.docente_id}>
            <select className={icls(errors.docente_id)} value={modal.docente_id ?? ''} onChange={e => set('docente_id', e.target.value)}>
              <option value="">— Seleccionar docente —</option>
              {docentes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Materia / Asignatura" full error={errors.materia_id}>
            <select className={icls(errors.materia_id)} value={modal.materia_id ?? ''} onChange={e => set('materia_id', e.target.value)}>
              <option value="">— Seleccionar materia —</option>
              {(materias as { id: string; nombre: string; clave: string }[]).map(m => (
                <option key={m.id} value={m.id}>{m.nombre} ({m.clave})</option>
              ))}
            </select>
          </Field>
          <Field label="Grupo" error={errors.grupo_id}>
            <select className={icls(errors.grupo_id)} value={modal.grupo_id ?? ''} onChange={e => set('grupo_id', e.target.value)}>
              <option value="">— Seleccionar grupo —</option>
              {(grupos as { id: string; clave: string; carrera?: { clave: string } }[]).map(g => (
                <option key={g.id} value={g.id}>{g.clave} — {g.carrera?.clave ?? ''}</option>
              ))}
            </select>
          </Field>
          <Field label="Periodo" error={errors.periodo_id}>
            <select className={icls(errors.periodo_id)} value={modal.periodo_id ?? ''} onChange={e => set('periodo_id', e.target.value)}>
              <option value="">— Seleccionar periodo —</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Horas por semana" error={errors.horas_semana}>
            <input
              className={icls(errors.horas_semana)}
              type="number" min={1} max={40}
              value={modal.horas_semana ?? 3}
              onChange={e => set('horas_semana', Number(e.target.value))}
            />
          </Field>
        </ModalWrap>
      )}
    </div>
  )
}
