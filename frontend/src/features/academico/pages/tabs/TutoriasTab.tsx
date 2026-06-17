import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type Tutoria } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { Field, Th, EmptyRow, selectCls, usePeriodos, useAlumnos } from './shared'

export default function TutoriasTab() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroTutor, setFiltroTutor] = useState('')
  const [modal, setModal] = useState<{ tutor_id: string; periodo_id: string; alumno_ids: string[] } | null>(null)

  const { data: periodos = [] } = usePeriodos()
  const { data: docentes = [] } = useQuery({ queryKey: ['docentes'], queryFn: academicoApi.getDocentes, staleTime: 60_000 })
  const { data: alumnos = [] } = useAlumnos()

  const { data: tutorias = [], isLoading } = useQuery({
    queryKey: ['tutorias', filtroPeriodo, filtroTutor],
    queryFn: () => {
      const p: Record<string, string> = {}
      if (filtroPeriodo) p.periodo_id = filtroPeriodo
      if (filtroTutor)   p.tutor_id   = filtroTutor
      return academicoApi.getTutorias(p)
    },
  })

  const saveMasivo = useMutation({
    mutationFn: () => academicoApi.createTutoriaMasiva(modal!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutorias'] }); addToast('Tutorías asignadas.', 'success'); setModal(null) },
    onError: (e: any) => addToast(e?.response?.data?.message ?? 'Error', 'error'),
  })

  const del = useMutation({
    mutationFn: (id: string) => academicoApi.deleteTutoria(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tutorias'] }); addToast('Tutoría eliminada.', 'success') },
    onError: (e: any) => addToast(e?.response?.data?.message ?? 'Error', 'error'),
  })

  const toggleAlumno = (id: string) =>
    setModal(m => m ? { ...m, alumno_ids: m.alumno_ids.includes(id) ? m.alumno_ids.filter(x => x !== id) : [...m.alumno_ids, id] } : m)

  // Agrupar por tutor para vista compacta
  const tutorMap = new Map<string, Tutoria[]>()
  tutorias.forEach(t => {
    const key = t.tutor_id
    if (!tutorMap.has(key)) tutorMap.set(key, [])
    tutorMap.get(key)!.push(t)
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
            <option value="">Todos los periodos</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filtroTutor} onChange={e => setFiltroTutor(e.target.value)}>
            <option value="">Todos los tutores</option>
            {docentes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button onClick={() => setModal({ tutor_id: '', periodo_id: '', alumno_ids: [] })}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <span className="text-base leading-none">+</span> Asignar tutorías
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr><Th>Tutor</Th><Th>Alumno</Th><Th>Carrera</Th><Th>Periodo</Th><Th /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <EmptyRow cols={5} msg="Cargando…" />}
            {!isLoading && tutorias.length === 0 && <EmptyRow cols={5} />}
            {tutorias.map(t => (
              <tr key={t.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
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

      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="font-semibold text-slate-900">Asignar tutorías</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <Field label="Tutor">
                <select className={selectCls} value={modal.tutor_id} onChange={e => setModal(m => ({ ...m!, tutor_id: e.target.value }))}>
                  <option value="">— Seleccionar tutor —</option>
                  {docentes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Periodo">
                <select className={selectCls} value={modal.periodo_id} onChange={e => setModal(m => ({ ...m!, periodo_id: e.target.value }))}>
                  <option value="">— Seleccionar periodo —</option>
                  {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Field>
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">Alumnos a asignar <span className="text-slate-400">({modal.alumno_ids.length} seleccionados)</span></p>
                <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {alumnos.map(a => (
                    <label key={a.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={modal.alumno_ids.includes(a.id)} onChange={() => toggleAlumno(a.id)} />
                      <span className="font-mono text-xs text-slate-500 w-28 shrink-0">{a.numero_control}</span>
                      <span className="text-sm">{a.user?.name ?? '—'}</span>
                      <span className="text-xs text-slate-400 ml-auto">{a.semestre_actual}°</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={() => saveMasivo.mutate()} disabled={!modal.tutor_id || !modal.periodo_id || modal.alumno_ids.length === 0 || saveMasivo.isPending}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saveMasivo.isPending ? 'Asignando…' : `Asignar ${modal.alumno_ids.length > 0 ? `(${modal.alumno_ids.length})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
