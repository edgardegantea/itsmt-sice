import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type Grupo } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { Field, ModalWrap, SortableTh, SkeletonRows, EmptyRow, CapacityBar, icls, useCarreras, usePeriodos, mutationError, extractApiErrors, useSorted } from '../tabs/shared'
import { useConfirm } from '../../../../components/ConfirmDialog'

const TURNO_LABEL = { matutino: 'Matutino', vespertino: 'Vespertino', sabatino: 'Sabatino' }
const TURNO_COLOR: Record<string, string> = {
  matutino:   'bg-sky-100 text-sky-700',
  vespertino: 'bg-violet-100 text-violet-700',
  sabatino:   'bg-orange-100 text-orange-700',
}

export default function GruposPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { toast: addToast } = useToastStore()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<Partial<Grupo> | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: carreras = [] } = useCarreras()
  const { data: periodos = [] } = usePeriodos()

  const { data: grupos = [], isLoading } = useQuery({
    queryKey: ['grupos', filtroPeriodo, filtroCarrera],
    queryFn: () => {
      const p: Record<string, string> = {}
      if (filtroPeriodo) p.periodo_id = filtroPeriodo
      if (filtroCarrera) p.carrera_id = filtroCarrera
      return academicoApi.getGrupos(p)
    },
  })

  const gruposFiltrados = busqueda.trim()
    ? grupos.filter(g =>
        g.clave.toLowerCase().includes(busqueda.toLowerCase()) ||
        (g.carrera?.nombre ?? '').toLowerCase().includes(busqueda.toLowerCase())
      )
    : grupos

  const { sorted, sort, onSort } = useSorted(gruposFiltrados, 'clave', 'asc')

  const save = useMutation({
    mutationFn: () => modal?.id ? academicoApi.updateGrupo(modal.id!, modal) : academicoApi.createGrupo(modal!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupos'] })
      addToast('Grupo guardado.', 'success')
      setModal(null)
      setErrors({})
    },
    onError: (e) => {
      const extracted = extractApiErrors(e)
      if (Object.keys(extracted).length) setErrors(extracted)
      else addToast(mutationError(e), 'error')
    },
  })

  const del = useMutation({
    mutationFn: (id: string) => academicoApi.deleteGrupo(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grupos'] }); addToast('Grupo eliminado.', 'success') },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  const set = (k: keyof Grupo, v: unknown) => setModal(m => ({ ...m, [k]: v }))

  const totalAlumnos = grupos.reduce((s, g) => s + (g.alumnos_count ?? 0), 0)
  const gruposLlenos = grupos.filter(g => (g.alumnos_count ?? 0) >= g.capacidad).length

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
              <h1 className="text-xl font-bold text-slate-900">Grupos</h1>
              <p className="text-sm text-slate-500 mt-0.5">Grupos de estudio por periodo, carrera y semestre</p>
            </div>
            <button
              onClick={() => setModal({ turno: 'matutino', capacidad: 35, semestre: 1 })}
              className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              + Nuevo grupo
            </button>
          </div>
        </div>

        {/* Stats */}
        {grupos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">Total grupos</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{grupos.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">Alumnos asignados</p>
              <p className="text-2xl font-bold text-blue-700 mt-0.5">{totalAlumnos}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">Grupos llenos</p>
              <p className={`text-2xl font-bold mt-0.5 ${gruposLlenos > 0 ? 'text-red-600' : 'text-slate-400'}`}>{gruposLlenos}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">Lugares disponibles</p>
              <p className="text-2xl font-bold text-emerald-600 mt-0.5">
                {grupos.reduce((s, g) => s + Math.max(0, g.capacidad - (g.alumnos_count ?? 0)), 0)}
              </p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-44">
            <label className="block text-xs font-medium text-slate-600 mb-1">Buscar</label>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Clave o carrera…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-slate-600 mb-1">Periodo</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
              <option value="">Todos los periodos</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' ●' : ''}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-slate-600 mb-1">Carrera</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white" value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)}>
              <option value="">Todas las carreras</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <SortableTh field="clave" sort={sort} onSort={onSort}>Clave</SortableTh>
                <SortableTh field="carrera.clave" sort={sort} onSort={onSort}>Carrera</SortableTh>
                <SortableTh field="periodo.nombre" sort={sort} onSort={onSort}>Periodo</SortableTh>
                <SortableTh field="semestre" sort={sort} onSort={onSort}>Sem.</SortableTh>
                <SortableTh field="turno" sort={sort} onSort={onSort}>Turno</SortableTh>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Capacidad</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && <SkeletonRows cols={7} />}
              {!isLoading && sorted.length === 0 && (
                <EmptyRow cols={7} msg={busqueda ? 'Sin resultados para la búsqueda.' : 'No hay grupos registrados.'} />
              )}
              {sorted.map(g => (
                <tr
                  key={g.id}
                  className="hover:bg-blue-50/60 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/gestion-academica/grupos/${g.id}`)}
                >
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">{g.clave}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{g.carrera?.clave ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{g.periodo?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-center font-medium text-slate-700">{g.semestre}°</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TURNO_COLOR[g.turno] ?? 'bg-slate-100 text-slate-600'}`}>
                      {TURNO_LABEL[g.turno] ?? g.turno}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CapacityBar current={g.alumnos_count ?? 0} max={g.capacidad} />
                  </td>
                  <td className="px-4 py-3 text-right space-x-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/admin/gestion-academica/grupos/${g.id}`)} className="text-xs text-green-700 hover:underline">Ver</button>
                    <button onClick={() => setModal(g)} className="text-xs text-blue-600 hover:underline">Editar</button>
                    <button
                      onClick={() => confirm({
                        title: `¿Eliminar grupo ${g.clave}?`,
                        description: 'Esta acción no se puede deshacer. Los alumnos asignados serán desvinculados.',
                        confirmLabel: 'Eliminar grupo',
                        onConfirm: () => del.mutateAsync(g.id),
                      })}
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
      </div>

      {modal !== null && (
        <ModalWrap
          title={modal.id ? 'Editar grupo' : 'Nuevo grupo'}
          onClose={() => { setModal(null); setErrors({}) }}
          onSave={() => save.mutate()}
          saving={save.isPending}
        >
          <Field label="Carrera *" error={errors.carrera_id}>
            <select className={icls(errors.carrera_id)} value={modal.carrera_id ?? ''} onChange={e => set('carrera_id', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Periodo *" error={errors.periodo_id}>
            <select className={icls(errors.periodo_id)} value={modal.periodo_id ?? ''} onChange={e => set('periodo_id', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Clave del grupo *" error={errors.clave}>
            <input className={icls(errors.clave)} value={modal.clave ?? ''} placeholder="ISC-1A" onChange={e => set('clave', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Semestre *" error={errors.semestre}>
            <select className={icls(errors.semestre)} value={modal.semestre ?? 1} onChange={e => set('semestre', Number(e.target.value))}>
              {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>{s}°</option>)}
            </select>
          </Field>
          <Field label="Turno *" error={errors.turno}>
            <select className={icls(errors.turno)} value={modal.turno ?? 'matutino'} onChange={e => set('turno', e.target.value)}>
              {Object.entries(TURNO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Capacidad máxima" error={errors.capacidad}>
            <input className={icls(errors.capacidad)} type="number" min={1} max={100} value={modal.capacidad ?? 35} onChange={e => set('capacidad', Number(e.target.value))} />
          </Field>
        </ModalWrap>
      )}

      {confirmDialog}
    </div>
  )
}
