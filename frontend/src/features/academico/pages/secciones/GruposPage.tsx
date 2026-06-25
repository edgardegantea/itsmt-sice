import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type Grupo } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { Field, ModalWrap, Th, EmptyRow, icls, useCarreras, usePeriodos, mutationError, extractApiErrors } from '../tabs/shared'

const TURNO_LABEL = { matutino: 'Matutino', vespertino: 'Vespertino', sabatino: 'Sabatino' }

export default function GruposPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { toast: addToast } = useToastStore()
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('')
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

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Gestión Académica
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Grupos</h1>
        </div>

        {/* Filtros + botón nuevo */}
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex gap-2 flex-wrap">
            <select
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              value={filtroPeriodo}
              onChange={e => setFiltroPeriodo(e.target.value)}
            >
              <option value="">Todos los periodos</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <select
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              value={filtroCarrera}
              onChange={e => setFiltroCarrera(e.target.value)}
            >
              <option value="">Todas las carreras</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <button
            onClick={() => setModal({ turno: 'matutino', capacidad: 35, semestre: 1 })}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span className="text-base leading-none">+</span> Nuevo grupo
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Clave</Th>
                <Th>Carrera</Th>
                <Th>Periodo</Th>
                <Th>Sem.</Th>
                <Th>Turno</Th>
                <Th>Alumnos</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && <EmptyRow cols={7} msg="Cargando…" />}
              {!isLoading && grupos.length === 0 && <EmptyRow cols={7} />}
              {grupos.map(g => (
                <tr
                  key={g.id}
                  className="hover:bg-blue-50/60 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/gestion-academica/grupos/${g.id}`)}
                >
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
                  <td className="px-4 py-3 text-right space-x-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/admin/gestion-academica/grupos/${g.id}`)}
                      className="text-xs text-green-700 hover:underline"
                    >
                      Ver detalle
                    </button>
                    <button
                      onClick={() => setModal(g)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => window.confirm('¿Eliminar grupo?') && del.mutate(g.id)}
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

        {/* Modal nuevo/editar grupo */}
        {modal !== null && (
          <ModalWrap
            title={modal.id ? 'Editar grupo' : 'Nuevo grupo'}
            onClose={() => { setModal(null); setErrors({}) }}
            onSave={() => save.mutate()}
            saving={save.isPending}
          >
            <Field label="Carrera" error={errors.carrera_id}>
              <select className={icls(errors.carrera_id)} value={modal.carrera_id ?? ''} onChange={e => set('carrera_id', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Field>
            <Field label="Periodo" error={errors.periodo_id}>
              <select className={icls(errors.periodo_id)} value={modal.periodo_id ?? ''} onChange={e => set('periodo_id', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Field>
            <Field label="Clave del grupo" error={errors.clave}>
              <input className={icls(errors.clave)} value={modal.clave ?? ''} placeholder="p.e. ISC-1A" onChange={e => set('clave', e.target.value.toUpperCase())} />
            </Field>
            <Field label="Semestre" error={errors.semestre}>
              <select className={icls(errors.semestre)} value={modal.semestre ?? 1} onChange={e => set('semestre', Number(e.target.value))}>
                {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>{s}°</option>)}
              </select>
            </Field>
            <Field label="Turno" error={errors.turno}>
              <select className={icls(errors.turno)} value={modal.turno ?? 'matutino'} onChange={e => set('turno', e.target.value)}>
                {Object.entries(TURNO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Capacidad máxima" error={errors.capacidad}>
              <input className={icls(errors.capacidad)} type="number" min={1} max={100} value={modal.capacidad ?? 35} onChange={e => set('capacidad', Number(e.target.value))} />
            </Field>
          </ModalWrap>
        )}
      </div>
    </div>
  )
}
