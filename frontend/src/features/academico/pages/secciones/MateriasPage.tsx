import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useConfirm } from '../../../../components/ConfirmDialog'
import { academicoApi, type Materia } from '../../services/academico'
import { Field, SkeletonRows, inputCls, selectCls, icls, ModalWrap, extractApiErrors, mutationError, useCarreras } from '../tabs/shared'
import { useToastStore } from '../../../../store/toastStore'

const SEMESTRES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// ── Chevron ───────────────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

// ── Sección de semestre ───────────────────────────────────────────────────────

function SemestreSection({
  semestre,
  materias,
  onEditar,
  onEliminar,
}: {
  semestre: number
  materias: Materia[]
  onEditar: (m: Materia) => void
  onEliminar: (m: Materia) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      {/* cabecera semestre */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <Chevron open={open} />
        <span className="text-sm font-semibold text-slate-700">{semestre}° Semestre</span>
        <span className="ml-auto text-xs text-slate-400">{materias.length} materia{materias.length !== 1 ? 's' : ''}</span>
      </button>

      {open && (
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-slate-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide w-28">Clave</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Nombre</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide w-16">Créd.</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide w-20">H.T/H.P</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide w-24">Tipo</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {materias
              .slice()
              .sort((a, b) => a.nombre.localeCompare(b.nombre))
              .map(m => (
                <tr key={m.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{m.clave}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {m.nombre}
                    {m.clave_oficial_tecnm && (
                      <span className="ml-2 text-xs text-slate-400 font-normal font-mono">{m.clave_oficial_tecnm}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-slate-600">{m.creditos}</td>
                  <td className="px-4 py-2.5 text-center text-xs text-slate-400">{m.horas_teoria}/{m.horas_practica}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.tipo === 'obligatoria' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                      {m.tipo === 'obligatoria' ? 'Obligatoria' : 'Optativa'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-2">
                    <button onClick={() => onEditar(m)} className="text-xs text-blue-600 hover:underline">Editar</button>
                    <button onClick={() => onEliminar(m)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Sección de carrera ────────────────────────────────────────────────────────

function CarreraSection({
  carrera,
  materias,
  onEditar,
  onEliminar,
}: {
  carrera: { id: string; nombre: string; clave: string }
  materias: Materia[]
  onEditar: (m: Materia) => void
  onEliminar: (m: Materia) => void
}) {
  const [open, setOpen] = useState(true)

  const porSemestre = useMemo(() => {
    const map = new Map<number, Materia[]>()
    for (const m of materias) {
      const sem = m.semestre ?? 0
      if (!map.has(sem)) map.set(sem, [])
      map.get(sem)!.push(m)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [materias])

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* cabecera carrera */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50/70 transition-colors text-left"
      >
        <Chevron open={open} />
        <div className="flex items-center gap-2.5 flex-1">
          <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-mono">{carrera.clave}</span>
          <span className="text-sm font-semibold text-slate-900">{carrera.nombre}</span>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{materias.length} materias</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-2">
          {porSemestre.map(([sem, mats]) => (
            <SemestreSection
              key={sem}
              semestre={sem}
              materias={mats}
              onEditar={onEditar}
              onEliminar={onEliminar}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MateriasPage() {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const { data: carreras = [] } = useCarreras()
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [filtroSemestre, setFiltroSemestre] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<Partial<Materia> | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { confirm, dialog: confirmDialog } = useConfirm()

  const { data: materias = [], isLoading } = useQuery({
    queryKey: ['materias'],
    queryFn: () => academicoApi.getMaterias({}),
  })

  // Filtrado local
  const materiasVistas = useMemo(() => {
    let list = materias as Materia[]
    if (filtroCarrera) list = list.filter(m => m.carrera_id === filtroCarrera || m.carrera?.id === filtroCarrera)
    if (filtroSemestre) list = list.filter(m => String(m.semestre) === filtroSemestre)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      list = list.filter(m =>
        m.nombre.toLowerCase().includes(q) ||
        m.clave.toLowerCase().includes(q) ||
        (m.clave_oficial_tecnm ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [materias, filtroCarrera, filtroSemestre, busqueda])

  // Agrupar por carrera
  const porCarrera = useMemo(() => {
    const map = new Map<string, { carrera: { id: string; nombre: string; clave: string }; materias: Materia[] }>()
    for (const m of materiasVistas) {
      const key = m.carrera?.id ?? 'sin-carrera'
      if (!map.has(key)) {
        map.set(key, {
          carrera: m.carrera ?? { id: 'sin-carrera', nombre: 'Sin carrera', clave: '—' },
          materias: [],
        })
      }
      map.get(key)!.materias.push(m)
    }
    return [...map.values()].sort((a, b) => a.carrera.clave.localeCompare(b.carrera.clave))
  }, [materiasVistas])

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
  const openEliminar = (m: Materia) => confirm({
    title: `¿Eliminar "${m.nombre}"?`,
    description: 'Se eliminará permanentemente del catálogo.',
    confirmLabel: 'Eliminar materia',
    onConfirm: () => del.mutateAsync(m.id),
  })

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
        {!isLoading && materiasVistas.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm">
              <span className="text-slate-500">Total</span>
              <span className="ml-2 font-semibold text-slate-900">{materiasVistas.length}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm">
              <span className="text-slate-500">Obligatorias</span>
              <span className="ml-2 font-semibold text-blue-700">{materiasVistas.filter(m => m.tipo === 'obligatoria').length}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm">
              <span className="text-slate-500">Optativas</span>
              <span className="ml-2 font-semibold text-amber-600">{materiasVistas.filter(m => m.tipo === 'optativa').length}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm">
              <span className="text-slate-500">Carreras</span>
              <span className="ml-2 font-semibold text-slate-900">{porCarrera.length}</span>
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

        {/* Skeleton */}
        {isLoading && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <tbody><SkeletonRows cols={6} rows={8} /></tbody>
            </table>
          </div>
        )}

        {/* Vista agrupada */}
        {!isLoading && porCarrera.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400 text-sm">
            {busqueda || filtroCarrera || filtroSemestre
              ? 'Sin resultados para los filtros aplicados.'
              : 'No hay materias registradas.'}
          </div>
        )}

        {!isLoading && porCarrera.map(({ carrera, materias: mats }) => (
          <CarreraSection
            key={carrera.id}
            carrera={carrera}
            materias={mats}
            onEditar={openEditar}
            onEliminar={openEliminar}
          />
        ))}
      </div>

      {confirmDialog}

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
