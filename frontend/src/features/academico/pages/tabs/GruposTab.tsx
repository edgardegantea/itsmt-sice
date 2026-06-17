import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type Grupo } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { Field, ModalWrap, Th, EmptyRow, inputCls, selectCls, useCarreras, usePeriodos, useAlumnos } from './shared'

const TURNO_LABEL = { matutino: 'Matutino', vespertino: 'Vespertino', sabatino: 'Sabatino' }

export default function GruposTab() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [modal, setModal] = useState<Partial<Grupo> | null>(null)
  const [detalle, setDetalle] = useState<Grupo | null>(null)
  const [asignarOpen, setAsignarOpen] = useState(false)
  const [selAlumnos, setSelAlumnos] = useState<string[]>([])

  const { data: carreras = [] } = useCarreras()
  const { data: periodos = [] } = usePeriodos()
  const { data: todosAlumnos = [] } = useAlumnos()

  const { data: grupos = [], isLoading } = useQuery({
    queryKey: ['grupos', filtroPeriodo, filtroCarrera],
    queryFn: () => {
      const p: Record<string, string> = {}
      if (filtroPeriodo) p.periodo_id = filtroPeriodo
      if (filtroCarrera) p.carrera_id = filtroCarrera
      return academicoApi.getGrupos(p)
    },
  })

  const save = useMutation({
    mutationFn: () => modal?.id ? academicoApi.updateGrupo(modal.id!, modal) : academicoApi.createGrupo(modal!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grupos'] }); addToast('Grupo guardado.', 'success'); setModal(null) },
    onError: (e: any) => addToast(e?.response?.data?.message ?? 'Error', 'error'),
  })

  const del = useMutation({
    mutationFn: (id: string) => academicoApi.deleteGrupo(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grupos'] }); addToast('Grupo eliminado.', 'success') },
    onError: (e: any) => addToast(e?.response?.data?.message ?? 'Error', 'error'),
  })

  const asignar = useMutation({
    mutationFn: () => academicoApi.asignarAlumnos(detalle!.id, selAlumnos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupos'] })
      qc.invalidateQueries({ queryKey: ['grupo-detalle', detalle?.id] })
      addToast('Alumnos asignados.', 'success')
      setAsignarOpen(false)
      setSelAlumnos([])
    },
    onError: (e: any) => addToast(e?.response?.data?.message ?? 'Error', 'error'),
  })

  const quitar = useMutation({
    mutationFn: ({ grupoId, alumnoId }: { grupoId: string; alumnoId: string }) =>
      academicoApi.quitarAlumno(grupoId, alumnoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupo-detalle', detalle?.id] })
      addToast('Alumno retirado.', 'success')
    },
    onError: (e: any) => addToast(e?.response?.data?.message ?? 'Error', 'error'),
  })

  const { data: grupoDetalle } = useQuery({
    queryKey: ['grupo-detalle', detalle?.id],
    queryFn: () => academicoApi.getGrupo(detalle!.id),
    enabled: !!detalle,
  })

  const set = (k: keyof Grupo, v: unknown) => setModal(m => ({ ...m, [k]: v }))

  // Alumnos que NO están ya en el grupo
  const alumnosEnGrupo = new Set((grupoDetalle?.alumnos ?? []).map(a => a.id))
  const alumnosDisponibles = todosAlumnos.filter(a => !alumnosEnGrupo.has(a.id))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
            <option value="">Todos los periodos</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)}>
            <option value="">Todas las carreras</option>
            {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <button onClick={() => setModal({ turno: 'matutino', capacidad: 35, semestre: 1 })}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <span className="text-base leading-none">+</span> Nuevo grupo
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr><Th>Clave</Th><Th>Carrera</Th><Th>Periodo</Th><Th>Sem.</Th><Th>Turno</Th><Th>Alumnos</Th><Th /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <EmptyRow cols={7} msg="Cargando…" />}
            {!isLoading && grupos.length === 0 && <EmptyRow cols={7} />}
            {grupos.map(g => (
              <tr key={g.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">{g.clave}</td>
                <td className="px-4 py-3 text-slate-600">{g.carrera?.clave ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{g.periodo?.nombre ?? '—'}</td>
                <td className="px-4 py-3 text-center">{g.semestre}°</td>
                <td className="px-4 py-3 text-slate-600">{TURNO_LABEL[g.turno] ?? g.turno}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-medium ${(g.alumnos_count ?? 0) >= g.capacidad ? 'text-red-600' : 'text-slate-700'}`}>
                    {g.alumnos_count ?? 0} / {g.capacidad}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => { setDetalle(g); setAsignarOpen(false) }} className="text-xs text-green-700 hover:underline">Alumnos</button>
                  <button onClick={() => setModal(g)} className="text-xs text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => window.confirm('¿Eliminar grupo?') && del.mutate(g.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo/editar grupo */}
      {modal !== null && (
        <ModalWrap title={modal.id ? 'Editar grupo' : 'Nuevo grupo'} onClose={() => setModal(null)} onSave={() => save.mutate()} saving={save.isPending}>
          <Field label="Carrera">
            <select className={selectCls} value={modal.carrera_id ?? ''} onChange={e => set('carrera_id', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Periodo">
            <select className={selectCls} value={modal.periodo_id ?? ''} onChange={e => set('periodo_id', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Clave del grupo">
            <input className={inputCls} value={modal.clave ?? ''} placeholder="p.e. ISC-1A" onChange={e => set('clave', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Semestre">
            <select className={selectCls} value={modal.semestre ?? 1} onChange={e => set('semestre', Number(e.target.value))}>
              {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>{s}°</option>)}
            </select>
          </Field>
          <Field label="Turno">
            <select className={selectCls} value={modal.turno ?? 'matutino'} onChange={e => set('turno', e.target.value)}>
              {Object.entries(TURNO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Capacidad máxima">
            <input className={inputCls} type="number" min={1} max={100} value={modal.capacidad ?? 35} onChange={e => set('capacidad', Number(e.target.value))} />
          </Field>
        </ModalWrap>
      )}

      {/* Panel detalle alumnos del grupo */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="font-semibold text-slate-900">Grupo {detalle.clave}</h2>
                <p className="text-xs text-slate-500">{detalle.carrera?.nombre} · {detalle.periodo?.nombre}</p>
              </div>
              <button onClick={() => setDetalle(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-slate-700">
                  {grupoDetalle?.alumnos?.length ?? 0} / {detalle.capacidad} alumnos
                </p>
                <button onClick={() => setAsignarOpen(true)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  + Asignar alumnos
                </button>
              </div>

              {asignarOpen && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                  <p className="text-xs font-medium text-slate-600">Seleccionar alumnos a agregar:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {alumnosDisponibles.length === 0 && <p className="text-xs text-slate-400">No hay alumnos disponibles.</p>}
                    {alumnosDisponibles.map(a => (
                      <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white rounded px-2 py-1">
                        <input type="checkbox" checked={selAlumnos.includes(a.id)}
                          onChange={e => setSelAlumnos(prev => e.target.checked ? [...prev, a.id] : prev.filter(x => x !== a.id))} />
                        <span className="font-mono text-xs text-slate-500 w-28 shrink-0">{a.numero_control}</span>
                        <span>{a.user?.name ?? '—'}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setAsignarOpen(false); setSelAlumnos([]) }} className="text-xs text-slate-500 hover:underline">Cancelar</button>
                    <button onClick={() => asignar.mutate()} disabled={selAlumnos.length === 0 || asignar.isPending}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg disabled:opacity-50">
                      {asignar.isPending ? 'Asignando…' : `Asignar ${selAlumnos.length > 0 ? `(${selAlumnos.length})` : ''}`}
                    </button>
                  </div>
                </div>
              )}

              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr><Th>N° Control</Th><Th>Nombre</Th><Th>Sem.</Th><Th /></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(grupoDetalle?.alumnos ?? []).length === 0 && <EmptyRow cols={4} msg="Sin alumnos asignados." />}
                  {(grupoDetalle?.alumnos ?? []).map(a => (
                    <tr key={a.id} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{a.numero_control}</td>
                      <td className="px-4 py-2.5 text-slate-900">{a.user?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{a.semestre_actual}°</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => window.confirm('¿Retirar alumno del grupo?') && quitar.mutate({ grupoId: detalle.id, alumnoId: a.id })}
                          className="text-xs text-red-500 hover:underline">Retirar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
