import { useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type Grupo, type GrupoHorarioDia } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { Field, ModalWrap, SkeletonRows, CapacityBar, icls, useCarreras, usePeriodos, usePlanteles, mutationError, extractApiErrors, HorarioPorDiaEditor } from '../tabs/shared'
import { useConfirm } from '../../../../components/ConfirmDialog'

const TURNO_LABEL = { matutino: 'Matutino', vespertino: 'Vespertino', sabatino: 'Sabatino' }
const TURNO_COLOR: Record<string, string> = {
  matutino:   'bg-sky-100 text-sky-700',
  vespertino: 'bg-violet-100 text-violet-700',
  sabatino:   'bg-orange-100 text-orange-700',
}

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

type LoteFila = { plantel_id: number | null; turno: Grupo['turno']; cantidad: number; capacidad: number }
const FILA_BLANK: LoteFila = { plantel_id: null, turno: 'matutino', cantidad: 1, capacidad: 35 }

export default function GruposPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { toast: addToast } = useToastStore()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<Partial<Grupo> | null>(null)
  const [letraGrupo, setLetraGrupo] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [modoLote, setModoLote] = useState(false)
  const [loteFilas, setLoteFilas] = useState<LoteFila[]>([])
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [modalHorarioLote, setModalHorarioLote] = useState(false)
  const [horarioLote, setHorarioLote] = useState<GrupoHorarioDia[]>([])

  const { data: carreras = [] } = useCarreras()
  const { data: periodos = [] } = usePeriodos()
  const { data: planteles = [] } = usePlanteles()

  const { data: grupos = [], isLoading } = useQuery({
    queryKey: ['grupos', filtroPeriodo, filtroCarrera],
    queryFn: () => {
      const p: Record<string, string> = {}
      if (filtroPeriodo) p.periodo_id = filtroPeriodo
      if (filtroCarrera) p.carrera_id = filtroCarrera
      return academicoApi.getGrupos(p)
    },
  })

  const gruposFiltrados = useMemo(() => {
    if (!busqueda.trim()) return grupos
    const q = busqueda.toLowerCase()
    return grupos.filter(g =>
      g.clave.toLowerCase().includes(q) ||
      (g.carrera?.nombre ?? '').toLowerCase().includes(q) ||
      (g.carrera?.clave ?? '').toLowerCase().includes(q)
    )
  }, [grupos, busqueda])

  // Agrupar: carrera → semestre → grupos
  const byCarrera = useMemo(() => {
    type SemEntry = { semestre: number; grupos: Grupo[] }
    type CarEntry = { id: string; nombre: string; clave: string; semestres: Map<number, SemEntry> }
    const map = new Map<string, CarEntry>()
    for (const g of gruposFiltrados) {
      const cid = g.carrera?.id ?? '_sin'
      if (!map.has(cid)) map.set(cid, { id: cid, nombre: g.carrera?.nombre ?? 'Sin carrera', clave: g.carrera?.clave ?? '—', semestres: new Map() })
      const ce = map.get(cid)!
      if (!ce.semestres.has(g.semestre)) ce.semestres.set(g.semestre, { semestre: g.semestre, grupos: [] })
      ce.semestres.get(g.semestre)!.grupos.push(g)
    }
    // ordenar grupos dentro de cada semestre por clave
    for (const ce of map.values())
      for (const se of ce.semestres.values())
        se.grupos.sort((a, b) => a.clave.localeCompare(b.clave))
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [gruposFiltrados])

  const [openCarreras, setOpenCarreras] = useState<Set<string>>(() => new Set())
  const [openSemestres, setOpenSemestres] = useState<Set<string>>(() => new Set())

  const toggle = useCallback((set: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
    set(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  }, [])

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

  // Clave sugerida: {periodo}-{carrera}-{semestre}{letra}-{plantel}[-SAB]
  // Ej. 2026-2-IAM-1A-MT (sabatino agrega el sufijo -SAB).
  function generarClave() {
    const periodo = periodos.find(p => p.id === modal?.periodo_id)
    const carrera = carreras.find(c => c.id === modal?.carrera_id)
    const plantel = planteles.find(p => p.id === modal?.plantel_id)
    if (!periodo?.codigo || !carrera || !modal?.semestre || !letraGrupo.trim() || !plantel) return
    const sufijoSabatino = modal.turno === 'sabatino' ? '-SAB' : ''
    const clave = `${periodo.codigo}-${carrera.clave}-${modal.semestre}${letraGrupo.trim().toUpperCase()}-${plantel.clave}${sufijoSabatino}`
    set('clave', clave)
  }

  function agregarFila() {
    setLoteFilas(f => [...f, { ...FILA_BLANK }])
  }
  function actualizarFila(idx: number, patch: Partial<LoteFila>) {
    setLoteFilas(f => f.map((row, i) => i === idx ? { ...row, ...patch } : row))
  }
  function quitarFila(idx: number) {
    setLoteFilas(f => f.filter((_, i) => i !== idx))
  }

  // Construye los grupos del lote: la letra avanza de forma continua entre
  // filas (A-E la primera fila, F-J la segunda, etc.), sin reiniciar por
  // plantel o turno.
  function construirGruposLote(): { grupos: Partial<Grupo>[]; error?: string } {
    const periodo = periodos.find(p => p.id === modal?.periodo_id)
    const carrera = carreras.find(c => c.id === modal?.carrera_id)
    if (!periodo?.codigo || !carrera || !modal?.semestre) return { grupos: [], error: 'Selecciona carrera, periodo y semestre.' }
    if (loteFilas.length === 0) return { grupos: [], error: 'Agrega al menos una fila.' }
    for (const f of loteFilas) {
      if (!f.plantel_id) return { grupos: [], error: 'Selecciona un plantel en cada fila.' }
      if (!f.cantidad || f.cantidad < 1) return { grupos: [], error: 'La cantidad debe ser al menos 1 en cada fila.' }
    }
    const totalGrupos = loteFilas.reduce((s, f) => s + f.cantidad, 0)
    if (totalGrupos > ALFABETO.length) return { grupos: [], error: `No se pueden generar más de ${ALFABETO.length} grupos a la vez (A-Z).` }

    const grupos: Partial<Grupo>[] = []
    let letraIdx = 0
    for (const fila of loteFilas) {
      const plantel = planteles.find(p => p.id === fila.plantel_id)
      if (!plantel) continue
      for (let i = 0; i < fila.cantidad; i++) {
        const letra = ALFABETO[letraIdx]
        letraIdx++
        const sufijo = fila.turno === 'sabatino' ? '-SAB' : ''
        grupos.push({
          carrera_id: modal!.carrera_id,
          periodo_id: modal!.periodo_id,
          semestre: modal!.semestre,
          turno: fila.turno,
          plantel_id: fila.plantel_id,
          capacidad: fila.capacidad,
          clave: `${periodo.codigo}-${carrera.clave}-${modal!.semestre}${letra}-${plantel.clave}${sufijo}`,
        })
      }
    }
    return { grupos }
  }

  const loteMut = useMutation({
    mutationFn: (grupos: Partial<Grupo>[]) => Promise.allSettled(grupos.map(g => academicoApi.createGrupo(g))),
    onSuccess: (results) => {
      const ok = results.filter(r => r.status === 'fulfilled').length
      const fail = results.length - ok
      qc.invalidateQueries({ queryKey: ['grupos'] })
      if (fail === 0) {
        addToast(`${ok} grupo(s) generado(s).`, 'success')
        setModal(null)
      } else {
        const primerError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
        addToast(`${ok} grupo(s) generado(s), ${fail} fallaron.${primerError ? ' ' + mutationError(primerError.reason) : ''}`, 'error')
      }
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  const horarioLoteMut = useMutation({
    mutationFn: () => academicoApi.aplicarHorariosDiasBulk([...seleccionados], horarioLote),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['grupos'] })
      addToast(`Horario aplicado a ${res.grupos_afectados} grupo(s).`, 'success')
      setModalHorarioLote(false)
      setModoSeleccion(false)
      setSeleccionados(new Set())
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  function toggleSeleccionado(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleGuardarLote() {
    const { grupos, error } = construirGruposLote()
    if (error) { addToast(error, 'error'); return }
    loteMut.mutate(grupos)
  }

  const previewLote = modoLote ? construirGruposLote() : { grupos: [] }

  const totalAlumnos = grupos.reduce((s, g) => s + (g.alumnos_count ?? 0), 0)
  const gruposLlenos = grupos.filter(g => (g.alumnos_count ?? 0) >= g.capacidad).length

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">

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
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { setModoSeleccion(v => !v); setSeleccionados(new Set()) }}
                className={`px-4 py-2 text-sm font-medium rounded-lg border ${modoSeleccion ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
              >
                {modoSeleccion ? 'Cancelar selección' : 'Editar horario por lote'}
              </button>
              <button
                onClick={() => {
                  setModal({ turno: 'matutino', capacidad: 35, semestre: 1 })
                  setLetraGrupo('')
                  setModoLote(false)
                  setLoteFilas([{ ...FILA_BLANK }])
                }}
                className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 flex items-center gap-2"
              >
                + Nuevo grupo
              </button>
            </div>
          </div>
        </div>

        {modoSeleccion && (
          <div className="bg-slate-800 text-white rounded-lg px-4 py-3 flex items-center justify-between flex-wrap gap-2 sticky top-0 z-10">
            <span className="text-sm">{seleccionados.size} grupo(s) seleccionado(s) — haz clic en las filas para elegir.</span>
            <button
              onClick={() => { setHorarioLote([]); setModalHorarioLote(true) }}
              disabled={seleccionados.size === 0}
              className="px-3 py-1.5 text-xs font-medium bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-40"
            >
              Aplicar horario a {seleccionados.size} grupo(s)
            </button>
          </div>
        )}

        {/* Stats */}
        {grupos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">Total grupos</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{grupos.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">Alumnos asignados</p>
              <p className="text-2xl font-bold text-brand-700 mt-0.5">{totalAlumnos}</p>
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
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

        {/* Acordeón carrera → semestre → grupo */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full"><tbody><SkeletonRows cols={4} /></tbody></table>
          </div>
        ) : byCarrera.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 px-6 py-12 text-center text-sm text-slate-400">
            {busqueda ? 'Sin resultados para la búsqueda.' : 'No hay grupos registrados.'}
          </div>
        ) : (
          <div className="space-y-3">
            {byCarrera.map(carrera => {
              const isOpenC = openCarreras.has(carrera.id)
              const totalGrupos = [...carrera.semestres.values()].reduce((s, se) => s + se.grupos.length, 0)
              const sortedSems = [...carrera.semestres.values()].sort((a, b) => a.semestre - b.semestre)

              return (
                <div key={carrera.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  {/* Nivel 1: Carrera */}
                  <button
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                    onClick={() => toggle(setOpenCarreras, carrera.id)}
                  >
                    <svg className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpenC ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0">{carrera.clave}</span>
                    <span className="font-semibold text-slate-800 text-sm truncate">{carrera.nombre}</span>
                    <span className="ml-auto text-xs text-slate-400 shrink-0">{totalGrupos} grupo{totalGrupos !== 1 ? 's' : ''}</span>
                  </button>

                  {isOpenC && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100">
                      {sortedSems.map(semEntry => {
                        const semKey = `${carrera.id}|${semEntry.semestre}`
                        const isOpenS = openSemestres.has(semKey)

                        return (
                          <div key={semKey}>
                            {/* Nivel 2: Semestre */}
                            <button
                              className="w-full flex items-center gap-3 pl-10 pr-5 py-2.5 hover:bg-slate-50/80 transition-colors text-left"
                              onClick={() => toggle(setOpenSemestres, semKey)}
                            >
                              <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isOpenS ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="text-xs font-semibold text-slate-600">{semEntry.semestre}° Semestre</span>
                              <span className="ml-auto text-xs text-slate-400">{semEntry.grupos.length} grupo{semEntry.grupos.length !== 1 ? 's' : ''}</span>
                            </button>

                            {isOpenS && (
                              <div className="border-t border-slate-50 divide-y divide-slate-50">
                                {semEntry.grupos.map(g => (
                                  <div
                                    key={g.id}
                                    className={`flex items-center gap-3 pl-16 pr-5 py-2.5 hover:bg-brand-50/40 transition-colors cursor-pointer ${modoSeleccion && seleccionados.has(g.id) ? 'bg-brand-50' : ''}`}
                                    onClick={() => modoSeleccion ? toggleSeleccionado(g.id) : navigate(`/admin/gestion-academica/grupos/${g.id}`)}
                                  >
                                    {modoSeleccion && (
                                      <input type="checkbox" checked={seleccionados.has(g.id)} onChange={() => toggleSeleccionado(g.id)} onClick={e => e.stopPropagation()} className="shrink-0" />
                                    )}
                                    <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded shrink-0">{g.clave}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${TURNO_COLOR[g.turno] ?? 'bg-slate-100 text-slate-600'}`}>
                                      {TURNO_LABEL[g.turno] ?? g.turno}
                                    </span>
                                    {g.horarios_liberados && (
                                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium shrink-0">liberado</span>
                                    )}
                                    <div className="ml-auto flex items-center gap-4">
                                      <CapacityBar current={g.alumnos_count ?? 0} max={g.capacidad} />
                                      <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => { setModal(g); setLetraGrupo(''); setModoLote(false) }} className="text-xs text-brand-600 hover:underline">Editar</button>
                                        <button
                                          onClick={() => {
                                            setModal({
                                              carrera_id: g.carrera_id,
                                              periodo_id: g.periodo_id,
                                              plantel_id: g.plantel_id,
                                              semestre: g.semestre,
                                              turno: g.turno,
                                              capacidad: g.capacidad,
                                              horarios_dias: (g.horarios_dias ?? []).map(h => ({ dia_semana: h.dia_semana, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin })),
                                            })
                                            setLetraGrupo('')
                                            setModoLote(false)
                                          }}
                                          className="text-xs text-slate-500 hover:underline"
                                        >Duplicar</button>
                                        <button
                                          onClick={() => confirm({
                                            title: `¿Eliminar grupo ${g.clave}?`,
                                            description: 'Esta acción no se puede deshacer.',
                                            confirmLabel: 'Eliminar grupo',
                                            onConfirm: () => del.mutateAsync(g.id),
                                          })}
                                          className="text-xs text-red-500 hover:underline"
                                        >Eliminar</button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal !== null && (
        <ModalWrap
          title={modal.id ? 'Editar grupo' : modoLote ? 'Generar grupos por lote' : 'Nuevo grupo'}
          onClose={() => { setModal(null); setErrors({}) }}
          onSave={() => modoLote ? handleGuardarLote() : save.mutate()}
          saving={modoLote ? loteMut.isPending : save.isPending}
        >
          {!modal.id && (
            <div className="col-span-2 flex gap-2 -mt-2 mb-1">
              <button
                type="button"
                onClick={() => setModoLote(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${!modoLote ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setModoLote(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${modoLote ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
              >
                Por lote
              </button>
            </div>
          )}

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
          <Field label="Semestre *" error={errors.semestre}>
            <select className={icls(errors.semestre)} value={modal.semestre ?? 1} onChange={e => set('semestre', Number(e.target.value))}>
              {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>{s}°</option>)}
            </select>
          </Field>

          {!modoLote && (
            <>
              <Field label="Letra de grupo">
                <input className={icls()} value={letraGrupo} maxLength={2} placeholder="A"
                  onChange={e => setLetraGrupo(e.target.value.toUpperCase())} />
              </Field>
              <Field label="Turno *" error={errors.turno}>
                <select className={icls(errors.turno)} value={modal.turno ?? 'matutino'} onChange={e => set('turno', e.target.value)}>
                  {Object.entries(TURNO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Plantel" error={errors.plantel_id}>
                <select className={icls(errors.plantel_id)} value={modal.plantel_id ?? ''} onChange={e => set('plantel_id', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— Sin asignar —</option>
                  {planteles.map(p => <option key={p.id} value={p.id}>{p.clave} — {p.nombre}</option>)}
                </select>
              </Field>
              <Field label="Clave del grupo *" full error={errors.clave}>
                <div className="flex gap-2">
                  <input className={icls(errors.clave)} value={modal.clave ?? ''} placeholder="2026-2-IAM-1A-MT" onChange={e => set('clave', e.target.value.toUpperCase())} />
                  <button
                    type="button"
                    onClick={generarClave}
                    title="Generar a partir de periodo, carrera, semestre, letra, turno y plantel"
                    className="shrink-0 px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                  >
                    Generar
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Formato: PERIODO-CARRERA-SEMESTRELETRA-PLANTEL (sabatino agrega -SAB).</p>
              </Field>
              <Field label="Horario por día (opcional)" full error={errors.horarios_dias}>
                <HorarioPorDiaEditor value={modal.horarios_dias ?? []} onChange={v => set('horarios_dias', v)} />
              </Field>
              <Field label="Capacidad máxima" error={errors.capacidad}>
                <input className={icls(errors.capacidad)} type="number" min={1} max={100} value={modal.capacidad ?? 35} onChange={e => set('capacidad', Number(e.target.value))} />
              </Field>
            </>
          )}

          {modoLote && (
            <Field label={`Filas de generación (${loteFilas.reduce((s, f) => s + (f.cantidad || 0), 0)} grupo(s) en total)`} full>
              <div className="space-y-2">
                {loteFilas.map((fila, idx) => (
                  <div key={idx} className="flex flex-wrap items-end gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                    <div className="min-w-36">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Plantel</label>
                      <select className={icls()} value={fila.plantel_id ?? ''} onChange={e => actualizarFila(idx, { plantel_id: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">— Seleccionar —</option>
                        {planteles.map(p => <option key={p.id} value={p.id}>{p.clave} — {p.nombre}</option>)}
                      </select>
                    </div>
                    <div className="min-w-28">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Turno</label>
                      <select className={icls()} value={fila.turno} onChange={e => actualizarFila(idx, { turno: e.target.value as Grupo['turno'] })}>
                        {Object.entries(TURNO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="w-20">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Cantidad</label>
                      <input type="number" min={1} max={26} className={icls()} value={fila.cantidad} onChange={e => actualizarFila(idx, { cantidad: Number(e.target.value) })} />
                    </div>
                    <div className="w-24">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Capacidad</label>
                      <input type="number" min={1} max={100} className={icls()} value={fila.capacidad} onChange={e => actualizarFila(idx, { capacidad: Number(e.target.value) })} />
                    </div>
                    {loteFilas.length > 1 && (
                      <button type="button" onClick={() => quitarFila(idx)} className="text-red-500 hover:underline text-xs pb-2">Quitar</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={agregarFila} className="text-xs text-brand-600 hover:underline">+ Agregar fila</button>
              </div>
              {previewLote.grupos.length > 0 && (
                <p className="text-[11px] text-slate-400 mt-2">
                  Se generarán: {previewLote.grupos.map(g => g.clave).join(', ')}
                </p>
              )}
            </Field>
          )}
        </ModalWrap>
      )}

      {modalHorarioLote && (
        <ModalWrap
          title={`Aplicar horario a ${seleccionados.size} grupo(s)`}
          onClose={() => setModalHorarioLote(false)}
          onSave={() => horarioLoteMut.mutate()}
          saving={horarioLoteMut.isPending}
        >
          <Field label="Horario por día" full>
            <HorarioPorDiaEditor value={horarioLote} onChange={v => setHorarioLote(v as GrupoHorarioDia[])} />
            <p className="text-[11px] text-slate-400 mt-2">
              Se reemplaza el horario actual de los grupos seleccionados. Deja todos los días sin marcar para quitarles la restricción horaria.
            </p>
          </Field>
        </ModalWrap>
      )}

      {confirmDialog}
    </div>
  )
}
