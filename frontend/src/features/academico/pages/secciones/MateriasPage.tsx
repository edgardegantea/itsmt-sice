import { useState, useMemo, useEffect } from 'react'
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

// ── Panel de detalle ──────────────────────────────────────────────────────────

function MateriaDetail({
  materia,
  onClose,
  onEditar,
  onEliminar,
}: {
  materia: Materia
  onClose: () => void
  onEditar: (m: Materia) => void
  onEliminar: (m: Materia) => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 250)
  }

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-900 font-medium flex-1">{value}</span>
    </div>
  )

  const totalHoras = materia.horas_teoria + materia.horas_practica

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-250 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full z-50 w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-250 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">{materia.clave}</span>
              {materia.clave_oficial_tecnm && (
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-mono">{materia.clave_oficial_tecnm}</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${materia.tipo === 'obligatoria' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {materia.tipo === 'obligatoria' ? 'Obligatoria' : 'Optativa'}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">{materia.nombre}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {materia.carrera?.clave} — {materia.carrera?.nombre} · {materia.semestre}° semestre
            </p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none shrink-0 mt-0.5">&times;</button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* Créditos y horas — tarjetas destacadas */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{materia.creditos}</div>
              <div className="text-xs text-blue-500 mt-0.5">Créditos</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-700">{materia.horas_teoria}</div>
              <div className="text-xs text-slate-500 mt-0.5">H. Teoría</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-700">{materia.horas_practica}</div>
              <div className="text-xs text-slate-500 mt-0.5">H. Práctica</div>
            </div>
          </div>

          {/* Barra total de horas */}
          <div className="bg-slate-50 rounded-xl px-4 py-3 mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Distribución de horas</span>
              <span className="font-medium text-slate-700">{totalHoras}h semanales</span>
            </div>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
              {totalHoras > 0 && (
                <>
                  <div
                    className="h-full bg-blue-500 rounded-l-full"
                    style={{ width: `${(materia.horas_teoria / totalHoras) * 100}%` }}
                    title={`Teoría: ${materia.horas_teoria}h`}
                  />
                  <div
                    className="h-full bg-teal-400 rounded-r-full"
                    style={{ width: `${(materia.horas_practica / totalHoras) * 100}%` }}
                    title={`Práctica: ${materia.horas_practica}h`}
                  />
                </>
              )}
            </div>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1 text-xs text-slate-500"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Teoría</span>
              <span className="flex items-center gap-1 text-xs text-slate-500"><span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />Práctica</span>
            </div>
          </div>

          {/* Detalles en lista */}
          <div className="divide-y divide-slate-100">
            {row('Carrera', materia.carrera ? `${materia.carrera.clave} — ${materia.carrera.nombre}` : '—')}
            {row('Semestre', `${materia.semestre}° semestre`)}
            {row('Tipo', materia.tipo === 'obligatoria' ? 'Obligatoria' : 'Optativa')}
            {row('Clave interna', <span className="font-mono">{materia.clave}</span>)}
            {materia.clave_oficial_tecnm && row('Clave TecNM', <span className="font-mono">{materia.clave_oficial_tecnm}</span>)}
            {row('Estado', (
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${materia.activa ? 'text-emerald-700' : 'text-slate-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${materia.activa ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                {materia.activa ? 'Activa' : 'Inactiva'}
              </span>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={() => { handleClose(); setTimeout(() => onEditar(materia), 260) }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => { handleClose(); setTimeout(() => onEliminar(materia), 260) }}
            className="px-4 py-2 border border-red-200 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </>
  )
}

// ── Sección de semestre ───────────────────────────────────────────────────────

function SemestreSection({
  semestre,
  materias,
  onVerDetalle,
  onEditar,
  onEliminar,
}: {
  semestre: number
  materias: Materia[]
  onVerDetalle: (m: Materia) => void
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
                <tr
                  key={m.id}
                  onClick={() => onVerDetalle(m)}
                  className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                >
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
                  <td className="px-4 py-2.5 text-right space-x-2" onClick={e => e.stopPropagation()}>
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
  onVerDetalle,
  onEditar,
  onEliminar,
}: {
  carrera: { id: string; nombre: string; clave: string }
  materias: Materia[]
  onVerDetalle: (m: Materia) => void
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
              onVerDetalle={onVerDetalle}
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
  const [detalle, setDetalle] = useState<Materia | null>(null)
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
  const openDetalle = (m: Materia) => setDetalle(m)
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
            onVerDetalle={openDetalle}
            onEditar={openEditar}
            onEliminar={openEliminar}
          />
        ))}
      </div>

      {confirmDialog}

      {/* Panel de detalle */}
      {detalle && (
        <MateriaDetail
          materia={detalle}
          onClose={() => setDetalle(null)}
          onEditar={openEditar}
          onEliminar={openEliminar}
        />
      )}

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
