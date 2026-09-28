import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { academicoApi, type AlumnoRiesgo, type NivelRiesgo } from '../../services/academico'
import { permanenciaApi } from '../../../permanencia/services/permanencia'
import { inputCls, usePeriodos } from '../tabs/shared'
import { usePeriodoActivo } from '../../../../hooks/usePeriodoActivo'
import { useAuthStore } from '../../../../store/authStore'

const ROLES_INICIAR_BAJA = ['superadmin', 'admin', 'personal_administrativo', 'jefe_carrera']

const NIVEL_LABEL: Record<NivelRiesgo, string> = { alto: 'Riesgo alto', medio: 'Riesgo medio', bajo: 'Riesgo bajo' }
const NIVEL_CLASE: Record<NivelRiesgo, string> = {
  alto: 'bg-red-100 text-red-700',
  medio: 'bg-amber-100 text-amber-700',
  bajo: 'bg-emerald-100 text-emerald-700',
}
const NIVEL_BARRA: Record<NivelRiesgo, string> = { alto: 'bg-red-500', medio: 'bg-amber-500', bajo: 'bg-emerald-500' }

export default function AlertasRiesgoAcademicoPage() {
  const { data: periodoActivo } = usePeriodoActivo()
  const { data: periodos = [] } = usePeriodos()
  const user = useAuthStore(s => s.user)
  const puedeIniciarBaja = user?.roles.some(r => ROLES_INICIAR_BAJA.includes(r)) ?? false

  // Arranca en el periodo activo, pero el usuario puede revisar cómo se veía
  // el riesgo académico en un periodo anterior — el backend ya acepta cualquier
  // periodo_id, solo faltaba exponer el selector.
  const [periodoId, setPeriodoId] = useState('')
  useEffect(() => {
    if (!periodoId && periodoActivo?.id) setPeriodoId(periodoActivo.id)
  }, [periodoActivo, periodoId])
  const periodoSeleccionado = periodos.find(p => p.id === periodoId)

  const [filtroCarreraId, setFiltroCarreraId] = useState('')
  const [filtroNivel, setFiltroNivel] = useState<NivelRiesgo | ''>('')
  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [iniciados, setIniciados] = useState<Set<string>>(new Set())

  const iniciarBajaMut = useMutation({
    mutationFn: (a: AlumnoRiesgo) => permanenciaApi.iniciarBajaDesdeRiesgo({
      alumno_id: a.alumno_id,
      periodo_id: periodoId,
      tipo_alerta: 'riesgo_academico',
      contexto_alerta: `Score ${a.score} (${NIVEL_LABEL[a.nivel_riesgo]}) — reprobación ${a.pct_reprobacion}%, inasistencia ${a.pct_inasistencia}%.`,
    }),
    onSuccess: (_data, a) => setIniciados(prev => new Set(prev).add(a.alumno_id)),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'No se pudo iniciar el trámite de baja.'),
  })

  const { data: alumnos = [], isLoading } = useQuery({
    queryKey: ['alertas-riesgo-academico', periodoId, filtroCarreraId, filtroNivel],
    queryFn: () => academicoApi.getAlertasRiesgoAcademico({
      periodo_id: periodoId,
      carrera_id: filtroCarreraId || undefined,
      nivel: filtroNivel || undefined,
    }),
    enabled: !!periodoId,
  })

  const carreras = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const a of alumnos) if (a.carrera_id && a.carrera) mapa.set(a.carrera_id, a.carrera)
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [alumnos])

  const alumnosBuscados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return alumnos
    return alumnos.filter(a =>
      a.nombre?.toLowerCase().includes(q) ||
      a.numero_control?.toLowerCase().includes(q) ||
      a.grupos.some(g => g.toLowerCase().includes(q))
    )
  }, [alumnos, busqueda])

  const totalAlto = alumnos.filter(a => a.nivel_riesgo === 'alto').length
  const totalMedio = alumnos.filter(a => a.nivel_riesgo === 'medio').length
  const totalBajo = alumnos.filter(a => a.nivel_riesgo === 'bajo').length

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Gestión Académica
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Alerta Temprana de Riesgo Académico</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cruce de reprobación, inasistencia, incidencias de prefectura y alertas de baja definitiva por alumno.
            Periodo: <span className="font-medium text-slate-700">{periodoSeleccionado?.nombre ?? '—'}</span>
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Riesgo alto</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{totalAlto}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Riesgo medio</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{totalMedio}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Riesgo bajo</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{totalBajo}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Periodo</label>
            <select value={periodoId} onChange={e => setPeriodoId(e.target.value)} className={`${inputCls} max-w-[200px]`}>
              {periodos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (activo)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Carrera</label>
            <select value={filtroCarreraId} onChange={e => setFiltroCarreraId(e.target.value)} className={`${inputCls} max-w-[220px]`}>
              <option value="">Todas</option>
              {carreras.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Nivel de riesgo</label>
            <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value as NivelRiesgo | '')} className={`${inputCls} max-w-[160px]`}>
              <option value="">Todos</option>
              <option value="alto">Alto</option>
              <option value="medio">Medio</option>
              <option value="bajo">Bajo</option>
            </select>
          </div>
          <input
            type="search"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar alumno, número de control o grupo…"
            className={`${inputCls} max-w-xs ml-auto`}
          />
        </div>

        {/* Lista */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {!periodoId ? (
            <div className="py-16 text-center text-slate-400 text-sm">No hay un periodo activo.</div>
          ) : isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Calculando riesgo académico…</div>
          ) : alumnosBuscados.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              {alumnos.length === 0 ? 'Sin alumnos con señales de riesgo este periodo.' : 'Nada coincide con la búsqueda.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alumnosBuscados.map((a: AlumnoRiesgo) => {
                const abierto = expandido === a.alumno_id
                return (
                  <Fragment key={a.alumno_id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandido(abierto ? null : a.alumno_id)}
                      onKeyDown={e => { if (e.key === 'Enter') setExpandido(abierto ? null : a.alumno_id) }}
                      className="w-full text-left px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="w-48 shrink-0">
                        <Link
                          to={`/admin/alumnos/${a.alumno_id}`}
                          onClick={e => e.stopPropagation()}
                          className="text-sm font-medium text-slate-800 hover:text-brand-700 hover:underline"
                        >
                          {a.nombre ?? '—'}
                        </Link>
                        <p className="text-xs text-slate-400">{a.numero_control} · {a.carrera} · {a.semestre_actual}°</p>
                      </div>
                      <div className="flex-1">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${NIVEL_BARRA[a.nivel_riesgo]} rounded-full`} style={{ width: `${a.score}%` }} />
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-28 text-center ${NIVEL_CLASE[a.nivel_riesgo]}`}>
                        {NIVEL_LABEL[a.nivel_riesgo]} ({a.score})
                      </span>
                      <span className={`text-slate-400 inline-block transition-transform shrink-0 ${abierto ? 'rotate-180' : ''}`}>⌄</span>
                    </div>
                    {abierto && (
                      <div className="px-5 py-3.5 bg-slate-50/60 flex flex-wrap gap-x-8 gap-y-2 text-xs">
                        <div>
                          <div className="text-slate-400 uppercase tracking-wide text-[10px]">Grupo(s)</div>
                          <div className="text-slate-700">{a.grupos.join(', ') || '—'}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 uppercase tracking-wide text-[10px]">% Reprobación</div>
                          <div className="text-slate-700">{a.pct_reprobacion}%</div>
                        </div>
                        <div>
                          <div className="text-slate-400 uppercase tracking-wide text-[10px]">% Inasistencia</div>
                          <div className="text-slate-700">{a.pct_inasistencia}%</div>
                        </div>
                        <div>
                          <div className="text-slate-400 uppercase tracking-wide text-[10px]">Incidencias en su grupo</div>
                          <div className="text-slate-700">{a.total_incidencias_grupo}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 uppercase tracking-wide text-[10px]">Alerta de baja definitiva</div>
                          <div className={a.alerta_baja_definitiva ? 'text-red-600 font-medium' : 'text-slate-700'}>
                            {a.alerta_baja_definitiva ? 'Sí, sin revisar' : 'No'}
                          </div>
                        </div>
                        {puedeIniciarBaja && (
                          <div className="ml-auto self-center">
                            {iniciados.has(a.alumno_id) ? (
                              <span className="text-xs text-emerald-600 font-medium">Trámite de baja iniciado ✓</span>
                            ) : (
                              <button
                                onClick={() => {
                                  if (confirm(`¿Iniciar trámite de baja temporal para ${a.nombre}? Quedará pendiente de aprobación.`)) {
                                    iniciarBajaMut.mutate(a)
                                  }
                                }}
                                disabled={iniciarBajaMut.isPending}
                                className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                Iniciar trámite de baja
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Fragment>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
