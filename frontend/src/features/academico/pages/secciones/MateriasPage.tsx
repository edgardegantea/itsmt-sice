import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type Materia } from '../../services/academico'
import { Field, Th, EmptyRow, inputCls, selectCls, icls, ModalWrap, extractApiErrors, mutationError, useCarreras } from '../tabs/shared'
import { useToastStore } from '../../../../store/toastStore'

const SEMESTRES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export default function MateriasPage() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const { data: carreras = [] } = useCarreras()
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [filtroSemestre, setFiltroSemestre] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<Partial<Materia> | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: materias = [], isLoading } = useQuery({
    queryKey: ['materias', filtroCarrera, filtroSemestre],
    queryFn: () => {
      const p: Record<string, string> = {}
      if (filtroCarrera) p.carrera_id = filtroCarrera
      if (filtroSemestre) p.semestre = filtroSemestre
      return academicoApi.getMaterias(p)
    },
  })

  const materiasVistas = useMemo(() => {
    if (!busqueda.trim()) return materias as Materia[]
    const q = busqueda.toLowerCase()
    return (materias as Materia[]).filter(m =>
      m.nombre.toLowerCase().includes(q) ||
      m.clave.toLowerCase().includes(q) ||
      (m.clave_oficial_tecnm ?? '').toLowerCase().includes(q)
    )
  }, [materias, busqueda])

  const totalObligatorias = materiasVistas.filter(m => m.tipo === 'obligatoria').length
  const totalOptativas = materiasVistas.filter(m => m.tipo === 'optativa').length

  const save = useMutation({
    mutationFn: () =>
      modal?.id
        ? academicoApi.updateMateria(modal.id!, modal)
        : academicoApi.createMateria(modal!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materias'] })
      addToast('Materia guardada.', 'success')
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
    mutationFn: (id: string) => academicoApi.deleteMateria(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materias'] }); addToast('Materia eliminada.', 'success') },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  const set = (k: keyof Materia, v: unknown) => setModal(m => ({ ...m, [k]: v }))
  const openNuevo = () => {
    setModal({ tipo: 'obligatoria', semestre: 1, creditos: 6, horas_teoria: 2, horas_practica: 2, activa: true })
    setErrors({})
  }
  const openEditar = (m: Materia) => { setModal(m); setErrors({}) }

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
              <h1 className="text-xl font-bold text-slate-900">Materias</h1>
              <p className="text-sm text-slate-500 mt-0.5">Catálogo de asignaturas por carrera y semestre</p>
            </div>
            <button
              onClick={openNuevo}
              className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              + Nueva materia
            </button>
          </div>
        </div>

        {/* Stats */}
        {materiasVistas.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm">
              <span className="text-slate-500">Total</span>
              <span className="ml-2 font-semibold text-slate-900">{materiasVistas.length}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm">
              <span className="text-slate-500">Obligatorias</span>
              <span className="ml-2 font-semibold text-blue-700">{totalObligatorias}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm">
              <span className="text-slate-500">Optativas</span>
              <span className="ml-2 font-semibold text-amber-600">{totalOptativas}</span>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-52">
            <label className="block text-xs font-medium text-slate-600 mb-1">Buscar</label>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Nombre, clave…"
              className={inputCls}
            />
          </div>
          <div className="flex-1 min-w-44">
            <label className="block text-xs font-medium text-slate-600 mb-1">Carrera</label>
            <select value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)} className={selectCls}>
              <option value="">Todas las carreras</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
            </select>
          </div>
          <div className="min-w-32">
            <label className="block text-xs font-medium text-slate-600 mb-1">Semestre</label>
            <select value={filtroSemestre} onChange={e => setFiltroSemestre(e.target.value)} className={selectCls}>
              <option value="">Todos</option>
              {SEMESTRES.map(s => <option key={s} value={s}>{s}°</option>)}
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Clave</Th>
                <Th>Nombre</Th>
                <Th>Carrera</Th>
                <Th>Sem.</Th>
                <Th>Cred.</Th>
                <Th>H.T / H.P</Th>
                <Th>Tipo</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && <EmptyRow cols={8} msg="Cargando…" />}
              {!isLoading && materiasVistas.length === 0 && <EmptyRow cols={8} />}
              {materiasVistas.map(m => (
                <tr key={m.id} className="hover:bg-blue-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{m.clave}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{m.nombre}</td>
                  <td className="px-4 py-3 text-slate-500">{m.carrera?.clave ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{m.semestre}°</td>
                  <td className="px-4 py-3 text-center text-slate-700">{m.creditos}</td>
                  <td className="px-4 py-3 text-center text-slate-500 text-xs">{m.horas_teoria} / {m.horas_practica}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.tipo === 'obligatoria' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {m.tipo === 'obligatoria' ? 'Obligatoria' : 'Optativa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEditar(m)} className="text-xs text-blue-600 hover:underline">Editar</button>
                    <button
                      onClick={() => window.confirm(`¿Eliminar "${m.nombre}"?`) && del.mutate(m.id)}
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

      {/* Modal crear/editar */}
      {modal !== null && (
        <ModalWrap
          title={modal.id ? `Editar: ${modal.nombre ?? ''}` : 'Nueva materia'}
          onClose={() => { setModal(null); setErrors({}) }}
          onSave={() => save.mutate()}
          saving={save.isPending}
        >
          <Field label="Carrera *" full error={errors.carrera_id}>
            <select className={icls(errors.carrera_id)} value={modal.carrera_id ?? ''} onChange={e => set('carrera_id', e.target.value)}>
              <option value="">— Selecciona —</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.clave} — {c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Clave interna *" error={errors.clave}>
            <input className={icls(errors.clave)} value={modal.clave ?? ''} placeholder="SIS-001" onChange={e => set('clave', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Clave TecNM" error={errors.clave_oficial_tecnm}>
            <input className={icls(errors.clave_oficial_tecnm)} value={modal.clave_oficial_tecnm ?? ''} placeholder="ACD-0907" onChange={e => set('clave_oficial_tecnm', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Nombre *" full error={errors.nombre}>
            <input className={icls(errors.nombre)} value={modal.nombre ?? ''} placeholder="Cálculo Integral" onChange={e => set('nombre', e.target.value)} />
          </Field>
          <Field label="Semestre" error={errors.semestre}>
            <select className={icls(errors.semestre)} value={modal.semestre ?? 1} onChange={e => set('semestre', +e.target.value)}>
              {SEMESTRES.map(s => <option key={s} value={s}>{s}°</option>)}
            </select>
          </Field>
          <Field label="Tipo" error={errors.tipo}>
            <select className={icls(errors.tipo)} value={modal.tipo ?? 'obligatoria'} onChange={e => set('tipo', e.target.value)}>
              <option value="obligatoria">Obligatoria</option>
              <option value="optativa">Optativa</option>
            </select>
          </Field>
          <Field label="Créditos" error={errors.creditos}>
            <input className={icls(errors.creditos)} type="number" min={1} max={20} value={modal.creditos ?? 6} onChange={e => set('creditos', +e.target.value)} />
          </Field>
          <Field label="Horas teoría" error={errors.horas_teoria}>
            <input className={icls(errors.horas_teoria)} type="number" min={0} max={10} value={modal.horas_teoria ?? 2} onChange={e => set('horas_teoria', +e.target.value)} />
          </Field>
          <Field label="Horas práctica" error={errors.horas_practica}>
            <input className={icls(errors.horas_practica)} type="number" min={0} max={10} value={modal.horas_practica ?? 2} onChange={e => set('horas_practica', +e.target.value)} />
          </Field>
        </ModalWrap>
      )}
    </div>
  )
}
