import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authStore'
import { academicoApi, type PlaneacionDocente, type CargaAcademica } from '../services/academico'
import apiClient from '../../../config/apiClient'
import { useToastStore } from '../../../store/toastStore'
import { SIN_INICIAR, EstatusBadge, progresoPlaneacion, BarraProgreso, selectCls } from './planeacionShared'
import { BookOpen, CircleDashed, Search } from 'lucide-react'

function IconLibro() {
  return (
    <BookOpen className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
  )
}

function SinIniciarBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap bg-slate-100 text-slate-500">
      <CircleDashed className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
      {SIN_INICIAR}
    </span>
  )
}

/** Resalta la porción del texto que coincide con la búsqueda, para que sea fácil ver por
 * qué esa fila apareció en los resultados sin tener que leer todo el fragmento. */
function resaltar(texto: string, q: string) {
  const i = texto.toLowerCase().indexOf(q.toLowerCase())
  if (i === -1) return texto
  return <>{texto.slice(0, i)}<mark className="bg-amber-200 rounded-sm px-0.5">{texto.slice(i, i + q.length)}</mark>{texto.slice(i + q.length)}</>
}

/** Buscador global — encuentra una palabra/frase en TODAS las planeaciones del docente a la
 * vez (caracterización, unidades, temas, actividades, indicadores, evidencias…), no solo en
 * la que tiene abierta. Cada resultado enlaza directo a la materia correspondiente. */
function BuscadorPlaneaciones({ navigate }: { navigate: (to: string) => void }) {
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [abierto, setAbierto] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (v: string) => {
    setQ(v)
    setAbierto(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setQDebounced(v), 350)
  }

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ['buscar-planeaciones', qDebounced],
    queryFn: () => academicoApi.buscarPlaneaciones(qDebounced),
    enabled: qDebounced.trim().length >= 2,
  })

  const totalCoincidencias = resultados.reduce((acc, r) => acc + r.total_coincidencias, 0)

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={2} aria-hidden="true" />
        <input
          value={q}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          placeholder="Buscar en todas tus planeaciones…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600/40"
        />
      </div>

      {abierto && qDebounced.trim().length >= 2 && (
        <div className="absolute z-20 mt-1.5 w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-lg max-h-96 overflow-y-auto">
          {isFetching ? (
            <p className="text-xs text-slate-400 p-4 text-center">Buscando…</p>
          ) : resultados.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center">Sin resultados para "{qDebounced}".</p>
          ) : (
            <div className="divide-y divide-slate-100">
              <p className="text-[11px] text-slate-400 px-3 pt-2.5 pb-1">
                {totalCoincidencias} coincidencia{totalCoincidencias !== 1 ? 's' : ''} en {resultados.length} materia{resultados.length !== 1 ? 's' : ''}
              </p>
              {resultados.map(r => (
                <div key={r.planeacion_id} className="p-3">
                  <button
                    type="button"
                    onMouseDown={() => navigate(`/docente/planeacion/${r.carga_academica_id}?periodo=${r.periodo_id}`)}
                    className="text-left w-full"
                  >
                    <p className="text-xs font-semibold text-brand-600 hover:underline">{r.materia ?? 'Materia'} <span className="font-normal text-slate-400">· {r.periodo}</span></p>
                  </button>
                  <div className="mt-1 space-y-1">
                    {r.coincidencias.map((c, i) => (
                      <p key={i} className="text-[11px] text-slate-500">
                        <span className="font-medium text-slate-600">{c.campo}:</span>{' '}
                        {resaltar(c.texto.length > 120 ? c.texto.slice(0, 120) + '…' : c.texto, qDebounced)}
                      </p>
                    ))}
                    {r.total_coincidencias > r.coincidencias.length && (
                      <p className="text-[10px] text-slate-400">+{r.total_coincidencias - r.coincidencias.length} más…</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, tono }: { label: string; value: number; tono: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 shadow-sm shadow-slate-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <p className={`text-2xl font-bold ${tono}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function PlaneacionDocentePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToastStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const periodoId = searchParams.get('periodo') ?? ''
  const setPeriodoId = (id: string) => setSearchParams(id ? { periodo: id } : {})
  const [clonando, setClonando] = useState<string | null>(null)

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos-select'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; activo: boolean }[]),
    staleTime: 60_000,
  })

  const { data: misCargas = [], isLoading: cargandoCargas } = useQuery({
    queryKey: ['mis-cargas', periodoId, user?.id],
    queryFn: () => academicoApi.getCargas({ docente_id: user!.id, periodo_id: periodoId }),
    enabled: !!periodoId && !!user?.id,
  })

  const { data: misPlaneaciones = [] } = useQuery({
    queryKey: ['mis-planeaciones', periodoId],
    queryFn: () => academicoApi.getMisPlaneaciones(periodoId ? { periodo_id: periodoId } : undefined),
    enabled: !!user?.id,
  })

  // Todas mis planeaciones (cualquier periodo) — para poder ofrecer "clonar" una liberada
  // de un periodo anterior como punto de partida de una materia que aún no se inicia aquí.
  const { data: todasMisPlaneaciones = [] } = useQuery({
    queryKey: ['mis-planeaciones-todas', user?.id],
    queryFn: () => academicoApi.getMisPlaneaciones(),
    enabled: !!user?.id,
  })

  const mutClonar = useMutation({
    mutationFn: ({ origenId, cargaId }: { origenId: string; cargaId: string }) =>
      academicoApi.clonarPlaneacion(origenId, { carga_academica_id: cargaId, periodo_id: periodoId }),
    onSuccess: (_, { cargaId }) => {
      toast.success('Planeación clonada como borrador — revísala antes de enviarla.')
      qc.invalidateQueries({ queryKey: ['mis-planeaciones'] })
      navigate(`/docente/planeacion/${cargaId}?periodo=${periodoId}`)
    },
    onError: () => toast.error('No se pudo clonar la planeación.'),
    onSettled: () => setClonando(null),
  })

  const planeacionClonableParaMateria = (materiaId: string) =>
    (todasMisPlaneaciones as PlaneacionDocente[])
      .filter(p => p.estatus === 'liberada' && p.periodo_id !== periodoId && p.carga_academica?.materia_id === materiaId)
      .sort((a, b) => (b.periodo?.nombre ?? '').localeCompare(a.periodo?.nombre ?? ''))[0]

  const clonar = (e: React.MouseEvent, origen: PlaneacionDocente, cargaId: string) => {
    e.stopPropagation()
    setClonando(cargaId)
    mutClonar.mutate({ origenId: origen.id, cargaId })
  }

  // El constructor de horarios crea una CargaAcademica independiente por cada bloque de
  // horario (día+hora), así que una misma materia+grupo puede tener varias filas. La
  // Instrumentación Didáctica es por materia+grupo+periodo (no por bloque de horario), así
  // que aquí se agrupan para mostrar una sola fila por combinación, prefiriendo como
  // representante la carga que ya tenga una planeación iniciada (si existe alguna).
  const planeacionDe = (cargaId: string) => (misPlaneaciones as PlaneacionDocente[]).find(pl => pl.carga_academica_id === cargaId)

  // Orden de prioridad visual: lo que requiere atención primero (devuelta), luego lo que
  // sigue en trámite, luego lo ya liberado o sin iniciar — así las devueltas no se pierden
  // entre el resto de la lista.
  const prioridadEstatus = (cargaId: string): number => {
    const estatus = planeacionDe(cargaId)?.estatus
    if (estatus === 'devuelta_da' || estatus === 'devuelta_jc') return 0
    if (estatus === 'enviada_da' || estatus === 'enviada_jc') return 1
    if (estatus === 'borrador') return 2
    if (!estatus) return 3
    return 4 // liberada
  }

  const misAsignaturas = (() => {
    const grupos = new Map<string, CargaAcademica>()
    for (const c of misCargas as CargaAcademica[]) {
      const clave = `${c.materia_id}|${(c.grupos ?? []).map(g => g.id).sort().join(',')}`
      const actual = grupos.get(clave)
      const tienePlaneacion = (id: string) => (misPlaneaciones as PlaneacionDocente[]).some(p => p.carga_academica_id === id)
      if (!actual || (!tienePlaneacion(actual.id) && tienePlaneacion(c.id))) {
        grupos.set(clave, c)
      }
    }
    return [...grupos.values()].sort((a, b) => prioridadEstatus(a.id) - prioridadEstatus(b.id))
  })()

  const abrirCarga = (cargaId: string) => {
    navigate(`/docente/planeacion/${cargaId}?periodo=${periodoId}`)
  }
  const liberadas = misAsignaturas.filter(c => planeacionDe(c.id)?.estatus === 'liberada').length
  const devueltas = misAsignaturas.filter(c => ['devuelta_da', 'devuelta_jc'].includes(planeacionDe(c.id)?.estatus ?? '')).length
  const sinIniciar = misAsignaturas.filter(c => !planeacionDe(c.id)).length

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-b from-slate-50 via-white to-white min-h-screen -mt-8 pt-8" data-modulo-planeacion>
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-brand-600/30">
          <IconLibro />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Instrumentación didáctica</h1>
          <p className="text-sm text-slate-500 mt-0.5">Formato oficial TecNM-AC-PO-003 — registra y entrega tu planeación por materia asignada.</p>
        </div>
      </div>

      {/* Filtro de periodo + buscador global */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm shadow-slate-200/60 flex flex-wrap gap-4 items-start">
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-slate-600 mb-1">Periodo *</label>
          <select value={periodoId} onChange={e => setPeriodoId(e.target.value)} className={selectCls}>
            <option value="">— Selecciona —</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (activo)' : ''}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Buscar en mis planeaciones</label>
          <BuscadorPlaneaciones navigate={navigate} />
        </div>
      </div>

      {periodoId && misAsignaturas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Asignaturas" value={misAsignaturas.length} tono="text-slate-800" />
          <StatCard label="Liberadas" value={liberadas} tono="text-emerald-600" />
          <StatCard label="Devueltas — requieren atención" value={devueltas} tono="text-red-600" />
          <StatCard label="Sin iniciar" value={sinIniciar} tono="text-slate-400" />
        </div>
      )}

      {/* Mis asignaturas — una fila por materia asignada, con % de avance de la instrumentación */}
      {periodoId && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm shadow-slate-200/60">
          <p className="px-5 pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mis asignaturas</p>
          {cargandoCargas ? (
            <p className="px-5 pb-4 text-sm text-slate-400">Cargando…</p>
          ) : misAsignaturas.length === 0 ? (
            <div className="px-5 pb-6 pt-1 text-center">
              <p className="text-sm text-slate-400">No tienes materias asignadas en este periodo.</p>
            </div>
          ) : (
            <>
              {/* Pantallas pequeñas: lista de tarjetas — la tabla completa no cabe sin cortarse. */}
              <div className="sm:hidden divide-y divide-slate-100 border-t border-slate-100">
                {misAsignaturas.map(c => {
                  const p = planeacionDe(c.id)
                  const porcentaje = progresoPlaneacion(p)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => abrirCarga(c.id)}
                      className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{c.materia?.nombre ?? '—'}</p>
                          <p className="text-xs text-slate-400">{c.grupos?.[0]?.clave ?? '—'}</p>
                        </div>
                        <span className="text-xs text-brand-600 font-medium shrink-0">{p ? 'Abrir →' : 'Iniciar →'}</span>
                      </div>
                      <div className="mt-2">
                        {p ? <EstatusBadge estatus={p.estatus} /> : <SinIniciarBadge />}
                      </div>
                      <div className="flex items-center gap-2 mt-2.5">
                        <BarraProgreso porcentaje={porcentaje} tono={porcentaje === 100 ? 'verde' : 'azul'} />
                        <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">{porcentaje}%</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Pantallas medianas en adelante: tabla completa */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left font-medium px-5 py-2.5">Asignatura</th>
                      <th className="text-left font-medium px-3 py-2.5">Estatus</th>
                      <th className="text-left font-medium px-3 py-2.5 w-56">Avance de la instrumentación</th>
                      <th className="px-3 py-2.5 w-44"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {misAsignaturas.map(c => {
                      const p = planeacionDe(c.id)
                      const clonable = !p && c.materia_id ? planeacionClonableParaMateria(c.materia_id) : undefined
                      const porcentaje = progresoPlaneacion(p)
                      return (
                        <tr
                          key={c.id}
                          onClick={() => abrirCarga(c.id)}
                          className="cursor-pointer hover:bg-slate-50 transition-colors group"
                        >
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-800">{c.materia?.nombre ?? '—'}</p>
                            <p className="text-xs text-slate-400">{c.grupos?.[0]?.clave ?? '—'}</p>
                          </td>
                          <td className="px-3 py-3.5">
                            {p ? <EstatusBadge estatus={p.estatus} /> : <SinIniciarBadge />}
                          </td>
                          <td className="px-3 py-3.5">
                            <div className="flex items-center gap-2">
                              <BarraProgreso porcentaje={porcentaje} tono={porcentaje === 100 ? 'verde' : 'azul'} />
                              <span className="text-xs text-slate-400 shrink-0 tabular-nums w-9 text-right">{porcentaje}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 text-right">
                            {clonable ? (
                              <button
                                type="button"
                                disabled={clonando === c.id}
                                onClick={e => clonar(e, clonable, c.id)}
                                title={`Clonar tu planeación liberada de ${clonable.periodo?.nombre ?? 'un periodo anterior'} como borrador`}
                                className="text-xs text-emerald-600 hover:underline font-medium disabled:opacity-50"
                              >
                                {clonando === c.id ? 'Clonando…' : 'Clonar de periodo anterior'}
                              </button>
                            ) : (
                              <span className="text-xs text-brand-600 font-medium group-hover:underline">{p ? 'Abrir →' : 'Iniciar →'}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
    </div>
  )
}
