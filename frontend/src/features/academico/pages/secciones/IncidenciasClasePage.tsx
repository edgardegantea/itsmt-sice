import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type EstatusIncidenciaClase, type Grupo, type IncidenciaClase } from '../../services/academico'
import { inputCls, selectCls, mutationError } from '../tabs/shared'
import { usePeriodoActivo } from '../../../../hooks/usePeriodoActivo'
import { useToastStore } from '../../../../store/toastStore'
import { formatFechaCorta } from '../../../../utils/date'
import { encolar, esErrorDeRed, obtenerCola, sincronizarCola } from '../../../../utils/offlineQueue'
import Modal from '../../../../components/ui/Modal'

const TIPO_COLA_INCIDENCIA = 'incidencia-clase'

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const
// getDay(): 0=domingo…6=sábado — se usa para inferir el día de la semana a partir de
// la fecha de la ronda, en vez de pedírselo aparte a quien registra.
const DIA_POR_INDICE: Record<number, typeof DIAS[number] | null> = {
  0: null, 1: 'lunes', 2: 'martes', 3: 'miercoles', 4: 'jueves', 5: 'viernes', 6: 'sabado',
}

const ESTATUS_LABEL: Record<EstatusIncidenciaClase, string> = {
  sin_novedad: 'Sin novedad',
  docente_ausente: 'Docente ausente',
  aula_vacia: 'Aula vacía',
  grupo_incorrecto: 'Grupo incorrecto',
  aula_incorrecta: 'Aula incorrecta',
  alumnos_incompletos: 'Alumnos incompletos',
  problema_infraestructura: 'Problema de infraestructura',
  otro: 'Otro',
}
const ESTATUS_CLASE: Record<EstatusIncidenciaClase, string> = {
  sin_novedad: 'bg-emerald-100 text-emerald-700',
  docente_ausente: 'bg-red-100 text-red-700',
  aula_vacia: 'bg-amber-100 text-amber-700',
  grupo_incorrecto: 'bg-orange-100 text-orange-700',
  aula_incorrecta: 'bg-orange-100 text-orange-700',
  alumnos_incompletos: 'bg-amber-100 text-amber-700',
  problema_infraestructura: 'bg-purple-100 text-purple-700',
  otro: 'bg-slate-100 text-slate-600',
}

function horaActual() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function fechaHoy() {
  return new Date().toISOString().slice(0, 10)
}

// ── Formulario de registro de ronda ─────────────────────────────────────────────

function FormularioRonda({ periodoId, grupoIdInicial, autoConsultar, onClose }: {
  periodoId: string
  /** Cuando se llega desde el QR del aula, el grupo que ya se resolvió por horario. */
  grupoIdInicial?: string
  /** Dispara "Consultar horario esperado" solo, sin que el usuario tenga que pedirlo. */
  autoConsultar?: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const toastError = useToastStore(s => s.error)
  const toastSuccess = useToastStore(s => s.success)

  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos-incidencias', periodoId],
    queryFn: () => academicoApi.getGrupos({ periodo_id: periodoId }),
    enabled: !!periodoId,
  })

  const estructura = useMemo(() => {
    const porCarrera = new Map<string, { carrera: string; carreraId?: string; grupos: Grupo[] }>()
    for (const g of grupos) {
      const nombre = g.carrera?.nombre ?? 'Sin carrera'
      if (!porCarrera.has(nombre)) porCarrera.set(nombre, { carrera: nombre, carreraId: g.carrera_id, grupos: [] })
      porCarrera.get(nombre)!.grupos.push(g)
    }
    return [...porCarrera.values()].sort((a, b) => a.carrera.localeCompare(b.carrera))
  }, [grupos])

  const [grupoId, setGrupoId] = useState(grupoIdInicial ?? '')
  const [fecha, setFecha] = useState(fechaHoy())
  const [hora, setHora] = useState(horaActual())
  const diaSemana = DIA_POR_INDICE[new Date(fecha + 'T12:00:00').getDay()]

  const [estatus, setEstatus] = useState<EstatusIncidenciaClase>('sin_novedad')
  const [docentePresente, setDocentePresente] = useState<boolean | null>(null)
  const [coincideHorario, setCoincideHorario] = useState(true)
  const [alumnosPresentes, setAlumnosPresentes] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const { data: horarioEsperado, isFetching: consultando, refetch } = useQuery({
    queryKey: ['horario-esperado', grupoId, periodoId, diaSemana, hora],
    queryFn: () => academicoApi.getHorarioEsperadoClase({ grupo_id: grupoId, periodo_id: periodoId, dia_semana: diaSemana!, hora }),
    enabled: false,
  })

  // Al llegar desde el QR del aula ya sabemos el grupo — solo falta jalar el
  // resto del horario esperado, sin que el prefecto tenga que pedirlo a mano.
  useEffect(() => {
    if (autoConsultar && grupoIdInicial && diaSemana) refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConsultar, grupoIdInicial])

  const mutGuardar = useMutation({
    mutationFn: () => {
      const payload = {
        periodo_id: periodoId,
        grupo_id: grupoId,
        carga_academica_id: horarioEsperado?.id ?? null,
        docente_id: horarioEsperado?.docente_id ?? null,
        aula_id: horarioEsperado?.aula_id ?? null,
        fecha,
        hora_revision: hora,
        dia_semana: diaSemana ?? undefined,
        estatus,
        docente_presente: docentePresente ?? undefined,
        coincide_horario: coincideHorario,
        alumnos_presentes: alumnosPresentes ? Number(alumnosPresentes) : undefined,
        observaciones: observaciones || undefined,
      }
      // Sin señal, ni siquiera se intenta el POST — se encola directo para no hacer
      // esperar al prefecto un timeout que ya sabemos que va a fallar.
      if (!navigator.onLine) {
        encolar(TIPO_COLA_INCIDENCIA, payload)
        return Promise.resolve('offline' as const)
      }
      return academicoApi.crearIncidenciaClase(payload).catch(e => {
        if (esErrorDeRed(e)) {
          encolar(TIPO_COLA_INCIDENCIA, payload)
          return 'offline' as const
        }
        throw e
      })
    },
    onSuccess: (resultado) => {
      qc.invalidateQueries({ queryKey: ['incidencias-clase'] })
      if (resultado === 'offline') {
        toastSuccess('Sin conexión — la ronda se guardó en este dispositivo y se enviará sola cuando vuelva la señal.')
      } else {
        toastSuccess('Ronda registrada en la bitácora.')
      }
      onClose()
    },
    onError: e => toastError(mutationError(e)),
  })

  return (
    <Modal title="Registrar ronda de prefectura" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fecha *</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Hora de la ronda *</label>
            <input type="time" value={hora} onChange={e => setHora(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Día</label>
            <input disabled value={diaSemana ? diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1) : 'Domingo (sin clases)'} className={`${inputCls} bg-slate-50 text-slate-500`} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Grupo a revisar *</label>
          <select value={grupoId} onChange={e => setGrupoId(e.target.value)} className={selectCls}>
            <option value="">Selecciona un grupo…</option>
            {estructura.map(c => (
              <optgroup key={c.carrera} label={c.carrera}>
                {c.grupos.sort((a, b) => a.clave.localeCompare(b.clave)).map(g => (
                  <option key={g.id} value={g.id}>{g.semestre}° — {g.clave}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {grupoId && diaSemana && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">Lo que dice el horario para este bloque:</p>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={consultando}
                className="text-xs text-brand-600 hover:underline disabled:opacity-50"
              >
                {consultando ? 'Consultando…' : 'Consultar horario esperado'}
              </button>
            </div>
            {horarioEsperado === undefined ? (
              <p className="text-xs text-slate-400 mt-1">Aún no se ha consultado.</p>
            ) : horarioEsperado === null ? (
              <p className="text-xs text-amber-600 mt-1">No hay ninguna materia programada en este grupo/horario — el aula debería estar libre.</p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span><span className="text-slate-400">Materia:</span> <span className="font-medium text-slate-800">{horarioEsperado.materia?.nombre ?? '—'}</span></span>
                <span><span className="text-slate-400">Docente:</span> <span className="font-medium text-slate-800">{horarioEsperado.docente?.name ?? '—'}</span></span>
                <span><span className="text-slate-400">Aula:</span> <span className="font-medium text-slate-800">{horarioEsperado.aula?.nombre ?? '—'}</span></span>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Resultado de la ronda *</label>
          <select value={estatus} onChange={e => setEstatus(e.target.value as EstatusIncidenciaClase)} className={selectCls}>
            {(Object.keys(ESTATUS_LABEL) as EstatusIncidenciaClase[]).map(k => (
              <option key={k} value={k}>{ESTATUS_LABEL[k]}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">¿Docente presente?</label>
            <select
              value={docentePresente === null ? '' : docentePresente ? '1' : '0'}
              onChange={e => setDocentePresente(e.target.value === '' ? null : e.target.value === '1')}
              className={selectCls}
            >
              <option value="">Sin especificar</option>
              <option value="1">Sí</option>
              <option value="0">No</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Alumnos presentes</label>
            <input type="number" min={0} max={200} value={alumnosPresentes} onChange={e => setAlumnosPresentes(e.target.value)} className={inputCls} placeholder="—" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={coincideHorario} onChange={e => setCoincideHorario(e.target.checked)} className="w-4 h-4 accent-brand-600" />
              <span className="text-sm text-slate-700">Coincide con el horario</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Observaciones</label>
          <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="Detalles de lo observado en la ronda…" />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button
            onClick={() => mutGuardar.mutate()}
            disabled={!grupoId || mutGuardar.isPending}
            className="px-4 py-2 text-sm text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {mutGuardar.isPending ? 'Guardando…' : 'Registrar ronda'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function IncidenciasClasePage() {
  const { data: periodoActivo } = usePeriodoActivo()
  const periodoId = periodoActivo?.id ?? ''

  // Llegar con ?auto=1&grupo_id=...&aula_id=... (desde el QR fijo del aula) abre el
  // formulario directo, ya con el grupo resuelto por horario — sin este atajo, el
  // prefecto tendría que volver a buscar a mano lo que el QR ya identificó.
  const [searchParams, setSearchParams] = useSearchParams()
  const grupoIdDesdeQr = searchParams.get('grupo_id') ?? undefined
  const autoAbrirDesdeQr = searchParams.get('auto') === '1'

  const [mostrarForm, setMostrarForm] = useState(autoAbrirDesdeQr && !!grupoIdDesdeQr)
  const [filaExpandida, setFilaExpandida] = useState<string | null>(null)

  // Cola offline: rondas registradas sin señal, pendientes de subir al servidor.
  const qc = useQueryClient()
  const toastSuccess = useToastStore(s => s.success)
  const toastError = useToastStore(s => s.error)
  const [pendientesOffline, setPendientesOffline] = useState(() => obtenerCola(TIPO_COLA_INCIDENCIA).length)
  const [sincronizando, setSincronizando] = useState(false)

  const sincronizar = async () => {
    if (sincronizando) return
    setSincronizando(true)
    try {
      const { sincronizados, pendientes } = await sincronizarCola(TIPO_COLA_INCIDENCIA, academicoApi.crearIncidenciaClase)
      setPendientesOffline(pendientes)
      if (sincronizados > 0) {
        qc.invalidateQueries({ queryKey: ['incidencias-clase'] })
        toastSuccess(`${sincronizados} ronda(s) sincronizada(s).`)
      }
      if (pendientes > 0) toastError(`${pendientes} ronda(s) aún no se pudieron sincronizar.`)
    } finally {
      setSincronizando(false)
    }
  }

  useEffect(() => {
    const actualizarContador = () => setPendientesOffline(obtenerCola(TIPO_COLA_INCIDENCIA).length)
    window.addEventListener('sice-cola-offline-cambio', actualizarContador)
    window.addEventListener('online', sincronizar)
    if (navigator.onLine) sincronizar() // intento silencioso al entrar a la página
    return () => {
      window.removeEventListener('sice-cola-offline-cambio', actualizarContador)
      window.removeEventListener('online', sincronizar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [filtroCarreraId, setFiltroCarreraId] = useState('')
  const [filtroSemestre, setFiltroSemestre] = useState('')
  const [filtroGrupoId, setFiltroGrupoId] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('')

  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos-incidencias', periodoId],
    queryFn: () => academicoApi.getGrupos({ periodo_id: periodoId }),
    enabled: !!periodoId,
  })
  const carreras = useMemo(() => {
    const mapa = new Map<string, { id: string; nombre: string }>()
    for (const g of grupos) if (g.carrera_id && g.carrera?.nombre) mapa.set(g.carrera_id, { id: g.carrera_id, nombre: g.carrera.nombre })
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [grupos])
  const gruposFiltro = useMemo(
    () => grupos.filter(g => (!filtroCarreraId || g.carrera_id === filtroCarreraId) && (!filtroSemestre || g.semestre === Number(filtroSemestre))),
    [grupos, filtroCarreraId, filtroSemestre]
  )

  const { data: incidencias = [], isLoading } = useQuery({
    queryKey: ['incidencias-clase', periodoId, filtroCarreraId, filtroSemestre, filtroGrupoId, filtroEstatus],
    queryFn: () => academicoApi.getIncidenciasClase({
      periodo_id: periodoId,
      carrera_id: filtroCarreraId || undefined,
      semestre: filtroSemestre || undefined,
      grupo_id: filtroGrupoId || undefined,
      estatus: filtroEstatus || undefined,
    }),
    enabled: !!periodoId,
  })

  const totalRondas = incidencias.length
  const totalSinNovedad = incidencias.filter(i => i.estatus === 'sin_novedad').length
  const totalConIncidencia = totalRondas - totalSinNovedad
  const pctCumplimiento = totalRondas > 0 ? Math.round((totalSinNovedad / totalRondas) * 100) : null

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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Incidencias de Clase — Bitácora de Prefectura</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Registro de rondas de verificación: docente, alumnos, grupo y aula contra lo programado en el horario.
                Periodo: <span className="font-medium text-slate-700">{periodoActivo?.nombre ?? '—'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pendientesOffline > 0 && (
                <button
                  onClick={sincronizar}
                  disabled={sincronizando}
                  className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded-lg hover:bg-amber-100 disabled:opacity-50 inline-flex items-center gap-1.5"
                  title="Rondas guardadas en este dispositivo, pendientes de subir"
                >
                  📡 {sincronizando ? 'Sincronizando…' : `${pendientesOffline} sin sincronizar`}
                </button>
              )}
              <button
                onClick={() => setMostrarForm(true)}
                disabled={!periodoId}
                className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                + Registrar ronda
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Rondas registradas</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{totalRondas}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500 font-medium">% Sin novedad</p>
            <p className={`text-3xl font-bold mt-1 ${pctCumplimiento === null ? 'text-slate-400' : pctCumplimiento >= 80 ? 'text-emerald-600' : pctCumplimiento >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {pctCumplimiento === null ? '—' : `${pctCumplimiento}%`}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <p className="text-sm text-slate-500 font-medium">Con incidencia</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{totalConIncidencia}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Carrera</label>
            <select value={filtroCarreraId} onChange={e => { setFiltroCarreraId(e.target.value); setFiltroSemestre(''); setFiltroGrupoId('') }} className={`${inputCls} max-w-[220px]`}>
              <option value="">Todas</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Semestre</label>
            <select value={filtroSemestre} onChange={e => { setFiltroSemestre(e.target.value); setFiltroGrupoId('') }} className={`${inputCls} max-w-[110px]`}>
              <option value="">Todos</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(s => <option key={s} value={s}>{s}°</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Grupo</label>
            <select value={filtroGrupoId} onChange={e => setFiltroGrupoId(e.target.value)} className={`${inputCls} max-w-[180px]`}>
              <option value="">Todos</option>
              {gruposFiltro.map(g => <option key={g.id} value={g.id}>{g.clave}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Resultado</label>
            <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} className={`${inputCls} max-w-[180px]`}>
              <option value="">Todos</option>
              {(Object.keys(ESTATUS_LABEL) as EstatusIncidenciaClase[]).map(k => (
                <option key={k} value={k}>{ESTATUS_LABEL[k]}</option>
              ))}
            </select>
          </div>
          {(filtroCarreraId || filtroSemestre || filtroGrupoId || filtroEstatus) && (
            <button
              onClick={() => { setFiltroCarreraId(''); setFiltroSemestre(''); setFiltroGrupoId(''); setFiltroEstatus('') }}
              className="text-xs text-slate-500 hover:text-brand-600 hover:underline pb-2"
            >
              Quitar filtros
            </button>
          )}
        </div>

        {/* Bitácora */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {!periodoId ? (
            <div className="py-16 text-center text-slate-400 text-sm">No hay un periodo activo.</div>
          ) : isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Cargando bitácora…</div>
          ) : incidencias.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">Sin rondas registradas con estos filtros.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha / Hora</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Grupo</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Docente esperado</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Aula</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Resultado</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incidencias.map((inc: IncidenciaClase) => {
                    const expandida = filaExpandida === inc.id
                    return (
                      <Fragment key={inc.id}>
                        <tr onClick={() => setFilaExpandida(expandida ? null : inc.id)} className="cursor-pointer hover:bg-slate-50">
                          <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{formatFechaCorta(inc.fecha)} · {inc.hora_revision?.slice(0, 5)}</td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-slate-800">{inc.grupo?.clave ?? '—'}</p>
                            <p className="text-xs text-slate-400">{inc.grupo?.carrera?.nombre} · {inc.grupo?.semestre}°</p>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{inc.docente?.name ?? inc.carga_academica?.docente?.name ?? '—'}</td>
                          <td className="px-4 py-2.5 text-slate-600">{inc.aula?.nombre ?? inc.carga_academica?.aula?.nombre ?? '—'}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTATUS_CLASE[inc.estatus]}`}>
                              {ESTATUS_LABEL[inc.estatus]}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`text-slate-400 inline-block transition-transform ${expandida ? 'rotate-180' : ''}`}>⌄</span>
                          </td>
                        </tr>
                        {expandida && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={6} className="px-4 py-3">
                              <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px]">Materia esperada</div>
                                  <div className="text-slate-700">{inc.carga_academica?.materia?.nombre ?? '—'}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px]">Docente presente</div>
                                  <div className="text-slate-700">{inc.docente_presente === null || inc.docente_presente === undefined ? 'Sin especificar' : inc.docente_presente ? 'Sí' : 'No'}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px]">Coincide horario</div>
                                  <div className="text-slate-700">{inc.coincide_horario ? 'Sí' : 'No'}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px]">Alumnos presentes</div>
                                  <div className="text-slate-700">{inc.alumnos_presentes ?? '—'}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px]">Registrado por</div>
                                  <div className="text-slate-700">{inc.registrado_por?.name ?? '—'}</div>
                                </div>
                                {inc.observaciones && (
                                  <div className="w-full">
                                    <div className="text-slate-400 uppercase tracking-wide text-[10px]">Observaciones</div>
                                    <div className="text-slate-700">{inc.observaciones}</div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {mostrarForm && periodoId && (
        <FormularioRonda
          periodoId={periodoId}
          grupoIdInicial={autoAbrirDesdeQr ? grupoIdDesdeQr : undefined}
          autoConsultar={autoAbrirDesdeQr}
          onClose={() => {
            setMostrarForm(false)
            if (autoAbrirDesdeQr) setSearchParams({}, { replace: true })
          }}
        />
      )}
    </div>
  )
}
