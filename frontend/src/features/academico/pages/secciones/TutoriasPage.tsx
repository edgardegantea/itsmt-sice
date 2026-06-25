import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type Tutoria } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { Field, Th, SkeletonRows, EmptyRow, icls, selectCls, usePeriodos, useAlumnos, mutationError, extractApiErrors } from '../tabs/shared'
import { useConfirm } from '../../../../components/ConfirmDialog'

type Vista = 'lista' | 'por-tutor'

export default function TutoriasPage() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroTutor, setFiltroTutor] = useState('')
  const [vista, setVista] = useState<Vista>('por-tutor')
  const [modal, setModal] = useState<{ tutor_id: string; periodo_id: string; alumno_ids: string[] } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { confirm, dialog: confirmDialog } = useConfirm()

  const { data: periodos = [] } = usePeriodos()
  const { data: docentes = [] } = useQuery({ queryKey: ['docentes'], queryFn: academicoApi.getDocentes, staleTime: 60_000 })
  const { data: alumnos = [] } = useAlumnos()

  const { data: tutorias = [], isLoading } = useQuery({
    queryKey: ['tutorias', filtroPeriodo, filtroTutor],
    queryFn: () => {
      const p: Record<string, string> = {}
      if (filtroPeriodo) p.periodo_id = filtroPeriodo
      if (filtroTutor) p.tutor_id = filtroTutor
      return academicoApi.getTutorias(p)
    },
  })

  const saveMasivo = useMutation({
    mutationFn: () => academicoApi.createTutoriaMasiva(modal!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutorias'] }); addToast('Tutorías asignadas.', 'success'); setModal(null); setErrors({}) },
    onError: (e) => {
      const extracted = extractApiErrors(e)
      if (Object.keys(extracted).length) setErrors(extracted)
      else addToast(mutationError(e), 'error')
    },
  })

  const del = useMutation({
    mutationFn: (id: string) => academicoApi.deleteTutoria(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutorias'] }); addToast('Tutoría eliminada.', 'success') },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  const toggleAlumno = (id: string) =>
    setModal(m => m ? { ...m, alumno_ids: m.alumno_ids.includes(id) ? m.alumno_ids.filter(x => x !== id) : [...m.alumno_ids, id] } : m)

  // Agrupar por tutor
  const tutorMap = new Map<string, Tutoria[]>()
  tutorias.forEach(t => {
    const key = t.tutor_id
    if (!tutorMap.has(key)) tutorMap.set(key, [])
    tutorMap.get(key)!.push(t)
  })

  const totalTutores = tutorMap.size

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
              <h1 className="text-xl font-bold text-slate-900">Tutorías</h1>
              <p className="text-sm text-slate-500 mt-0.5">Asignación de tutores a alumnos por periodo</p>
            </div>
            <button
              onClick={() => setModal({ tutor_id: '', periodo_id: '', alumno_ids: [] })}
              className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              + Asignar tutorías
            </button>
          </div>
        </div>

        {/* Stats */}
        {tutorias.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm">
              <span className="text-slate-500">Alumnos tutorados</span>
              <span className="ml-2 font-semibold text-slate-900">{tutorias.length}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm">
              <span className="text-slate-500">Tutores activos</span>
              <span className="ml-2 font-semibold text-blue-700">{totalTutores}</span>
            </div>
          </div>
        )}

        {/* Filtros + toggle vista */}
        <div className="flex flex-wrap gap-3 items-end justify-between">
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap gap-3 flex-1">
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-medium text-slate-600 mb-1">Periodo</label>
              <select className={selectCls} value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
                <option value="">Todos los periodos</option>
                {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-medium text-slate-600 mb-1">Tutor</label>
              <select className={selectCls} value={filtroTutor} onChange={e => setFiltroTutor(e.target.value)}>
                <option value="">Todos los tutores</option>
                {docentes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setVista('por-tutor')}
              title="Vista agrupada"
              className={`px-3 py-2 rounded-lg text-sm border transition-colors ${vista === 'por-tutor' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h8M4 18h8" />
              </svg>
            </button>
            <button
              onClick={() => setVista('lista')}
              title="Vista lista"
              className={`px-3 py-2 rounded-lg text-sm border transition-colors ${vista === 'lista' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Vista agrupada por tutor */}
        {vista === 'por-tutor' ? (
          isLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Cargando…</div>
          ) : tutorias.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-400">Sin tutorías registradas.</div>
          ) : (
            <div className="space-y-4">
              {Array.from(tutorMap.entries()).map(([tutorId, tutas]) => {
                const tutor = tutas[0]?.tutor
                return (
                  <div key={tutorId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold shrink-0">
                          {tutor?.name?.charAt(0) ?? '?'}
                        </div>
                        <span className="font-semibold text-slate-800">{tutor?.name ?? '—'}</span>
                      </div>
                      <span className="text-xs text-slate-400">{tutas.length} alumno{tutas.length !== 1 ? 's' : ''}</span>
                    </div>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-50">
                        {tutas.map(t => (
                          <tr key={t.id} className="hover:bg-blue-50/40 transition-colors">
                            <td className="px-4 py-2.5 w-36">
                              <span className="font-mono text-xs text-slate-500">{t.alumno?.numero_control}</span>
                            </td>
                            <td className="px-4 py-2.5 font-medium text-slate-800">{t.alumno?.user?.name ?? '—'}</td>
                            <td className="px-4 py-2.5 text-slate-500 text-xs">{t.alumno?.carrera?.nombre ?? '—'}</td>
                            <td className="px-4 py-2.5 text-slate-400 text-xs">{t.periodo?.nombre ?? '—'}</td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                onClick={() => confirm({ title: '¿Eliminar tutoría?', description: `Se eliminará la tutoría de ${t.alumno?.user?.name ?? t.alumno?.numero_control}.`, confirmLabel: 'Eliminar', onConfirm: () => del.mutateAsync(t.id) })}
                                className="text-xs text-red-500 hover:underline"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          /* Vista lista plana */
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr><Th>Tutor</Th><Th>Alumno</Th><Th>Carrera</Th><Th>Periodo</Th><Th /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && <SkeletonRows cols={5} />}
                {!isLoading && tutorias.length === 0 && <EmptyRow cols={5} />}
                {tutorias.map(t => (
                  <tr key={t.id} className="hover:bg-blue-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{t.tutor?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{t.alumno?.user?.name ?? '—'}</p>
                      <p className="text-xs text-slate-500 font-mono">{t.alumno?.numero_control}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.alumno?.carrera?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.periodo?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => window.confirm('¿Eliminar tutoría?') && del.mutate(t.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmDialog}

      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="font-semibold text-slate-900">Asignar tutorías</h2>
              <button onClick={() => { setModal(null); setErrors({}) }} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <Field label="Tutor *" error={errors.tutor_id}>
                <select className={icls(errors.tutor_id)} value={modal.tutor_id} onChange={e => setModal(m => ({ ...m!, tutor_id: e.target.value }))}>
                  <option value="">— Seleccionar tutor —</option>
                  {docentes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Periodo *" error={errors.periodo_id}>
                <select className={icls(errors.periodo_id)} value={modal.periodo_id} onChange={e => setModal(m => ({ ...m!, periodo_id: e.target.value }))}>
                  <option value="">— Seleccionar periodo —</option>
                  {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Field>
              {errors.alumno_ids && <p className="text-xs text-red-500">{errors.alumno_ids}</p>}
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">
                  Alumnos a asignar <span className="text-slate-400">({modal.alumno_ids.length} seleccionados)</span>
                </p>
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {alumnos.map(a => (
                    <label key={a.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={modal.alumno_ids.includes(a.id)} onChange={() => toggleAlumno(a.id)} />
                      <span className="font-mono text-xs text-slate-500 w-28 shrink-0">{a.numero_control}</span>
                      <span className="text-sm flex-1">
                        {a.user?.name ?? (a.inscripcion?.aspirante ? `${a.inscripcion.aspirante.nombres} ${a.inscripcion.aspirante.apellido_paterno}` : '—')}
                      </span>
                      <span className="text-xs text-slate-400">{a.semestre_actual}°</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
              <button onClick={() => { setModal(null); setErrors({}) }} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
              <button
                onClick={() => saveMasivo.mutate()}
                disabled={!modal.tutor_id || !modal.periodo_id || modal.alumno_ids.length === 0 || saveMasivo.isPending}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saveMasivo.isPending ? 'Asignando…' : `Asignar${modal.alumno_ids.length > 0 ? ` (${modal.alumno_ids.length})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
