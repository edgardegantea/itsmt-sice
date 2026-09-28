import { Fragment, useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, mergeCargasPorAsignatura } from '../../services/academico'
import type { CargaAcademica, Calificacion } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { useAuthStore } from '../../../../store/authStore'
import { usePeriodoActivo } from '../../../../hooks/usePeriodoActivo'
import { Th, mutationError, inputCls, selectCls } from '../tabs/shared'
import apiClient from '../../../../config/apiClient'
import ViewToggle, { useViewMode } from '../../../../components/ui/ViewToggle'
import Modal from '../../../../components/ui/Modal'
import { ChevronDown } from 'lucide-react'

function alumnoNombre(a: {
  user?: { name: string }
  inscripcion?: { aspirante?: { nombres: string; apellido_paterno: string; apellido_materno?: string } }
}): string {
  // Los nombres de los alumnos se muestran en mayúsculas en toda la captura de
  // calificaciones (convención de actas y documentos oficiales del TecNM).
  if (a.user?.name) return a.user.name.toUpperCase()
  if (a.inscripcion?.aspirante) {
    const asp = a.inscripcion.aspirante
    return `${asp.nombres} ${asp.apellido_paterno} ${asp.apellido_materno ?? ''}`.trim().toUpperCase()
  }
  return '—'
}


interface AlumnoRow {
  id: string
  numero_control: string
  user?: { name: string }
  inscripcion?: { aspirante?: { nombres: string; apellido_paterno: string; apellido_materno?: string } }
}

// ── Selector de grupo/materia ─────────────────────────────────────────────────

function SelectorGrupo({
  esDocente,
  currentUserId,
  periodoId,
  grupoId,
  cargaId,
  onChange,
  onAbrirCaptura,
}: {
  esDocente: boolean
  currentUserId?: string
  periodoId?: string
  grupoId: string | null
  cargaId: string | null
  onChange: (seleccion: { grupoId: string; cargaId: string | null } | null) => void
  /** Al elegir una materia (asignatura) concreta, abre su propia página de captura de calificaciones. */
  onAbrirCaptura: (seleccion: { grupoId: string; cargaId: string }) => void
}) {
  const { data: cargasDocente = [], isLoading: cargandoCargas } = useQuery({
    queryKey: ['mis-cargas-calificaciones', currentUserId, periodoId],
    queryFn: () => academicoApi.getCargas({ docente_id: currentUserId!, periodo_id: periodoId! }),
    enabled: esDocente && !!currentUserId && !!periodoId,
  })

  const { data: grupos = [], isLoading: cargandoGrupos } = useQuery({
    queryKey: ['grupos-calificaciones', periodoId],
    queryFn: () => academicoApi.getGrupos({ periodo_id: periodoId! }),
    enabled: !esDocente && !!periodoId,
  })

  // Fila expandida en la vista de lista — el detalle (periodo, turno, aula, horario,
  // estado) se oculta por defecto y solo se muestra bajo la fila al pedirlo, para que
  // la tabla no se vea saturada de columnas.
  const [filaExpandida, setFilaExpandida] = useState<string | null>(null)

  // Buscador libre (grupo, materia o docente) — para no tener que recorrer visualmente
  // decenas de carreras/semestres cuando se busca algo puntual.
  const [busqueda, setBusqueda] = useState('')

  const toastError = useToastStore(s => s.error)
  const [descargando, setDescargando] = useState<string | null>(null)

  async function descargarPdf(carreraId: string | undefined, nombreArchivo: string) {
    setDescargando(nombreArchivo)
    try {
      const blob = await academicoApi.descargarReporteCalificaciones({ carrera_id: carreraId, periodo_id: periodoId })
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = nombreArchivo
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toastError('No se pudo generar el PDF de calificaciones.')
    } finally {
      setDescargando(null)
    }
  }

  if (esDocente) {
    // Cada opción es una combinación única materia+grupo ya liberada en la
    // instrumentación didáctica del docente — no hace falta un segundo select
    // para elegir la materia porque ya quedó fijada aquí.
    // Una materia puede tener varias CargaAcademica para el mismo grupo (un bloque por
    // día/hora), y la instrumentación se liga a una de ellas en particular — no siempre
    // la "canónica" que la pantalla de captura reconoce (mergeCargasPorAsignatura, que
    // se queda con la de id menor). Por eso: primero se identifica qué combinaciones
    // materia+grupo están liberadas usando los registros originales, y luego se resuelve
    // el id canónico fusionando TODAS las cargas del docente (liberadas o no) — igual que
    // hace la pantalla de captura con las del grupo — para no ofrecer aquí un id que allá
    // no encuentre y truene con "Esta materia ya no está asignada a este grupo".
    const claveMateriaGrupo = (c: CargaAcademica) => `${c.materia_id}|${c.grupos?.[0]?.id ?? ''}`
    const clavesLiberadas = new Set(cargasDocente.filter(c => c.instrumentacion_liberada).map(claveMateriaGrupo))
    const opciones = mergeCargasPorAsignatura(cargasDocente)
      .filter(c => clavesLiberadas.has(claveMateriaGrupo(c)))
      .flatMap(c =>
        (c.grupos ?? []).map(g => ({
          grupoId: g.id,
          cargaId: c.id,
          label: `${c.materia?.nombre ?? 'Materia'} — Grupo ${g.clave}`,
        }))
      )
    return (
      <select
        value={cargaId ?? ''}
        onChange={e => {
          const o = opciones.find(op => op.cargaId === e.target.value)
          if (o) onAbrirCaptura({ grupoId: o.grupoId, cargaId: o.cargaId })
        }}
        className={`${inputCls} max-w-md`}
        disabled={cargandoCargas}
      >
        <option value="">
          {cargandoCargas
            ? 'Cargando…'
            : opciones.length === 0
              ? 'Sin materias liberadas para captura'
              : 'Selecciona una materia — grupo…'}
        </option>
        {opciones.map(o => <option key={o.cargaId} value={o.cargaId}>{o.label}</option>)}
      </select>
    )
  }

  // Carrera → semestre → grupo, para navegar la lista completa igual que el docente
  // navegaría un plan de estudios, en vez de una lista plana de todos los grupos.
  const estructura = useMemo(() => {
    const porCarrera = new Map<string, { carrera: string; carreraId?: string; semestres: Map<number, typeof grupos> }>()
    for (const g of grupos) {
      const carrera = g.carrera?.nombre ?? 'Sin carrera'
      if (!porCarrera.has(carrera)) porCarrera.set(carrera, { carrera, carreraId: g.carrera_id, semestres: new Map() })
      const bucket = porCarrera.get(carrera)!
      if (!bucket.semestres.has(g.semestre)) bucket.semestres.set(g.semestre, [])
      bucket.semestres.get(g.semestre)!.push(g)
    }
    return [...porCarrera.values()]
      .sort((a, b) => a.carrera.localeCompare(b.carrera))
      .map(c => ({
        carrera: c.carrera,
        carreraId: c.carreraId,
        semestres: [...c.semestres.entries()]
          .sort(([a], [b]) => a - b)
          .map(([semestre, gs]) => ({
            semestre,
            grupos: gs.slice().sort((a, b) => a.clave.localeCompare(b.clave)),
          })),
      }))
  }, [grupos])

  // Filtros independientes de Carrera y Semestre — se combinan con el de Grupo (que ya
  // existía) para poder acotar la lista por cualquier nivel sin tener que buscar el
  // grupo exacto en un combo con cientos de opciones.
  const [carreraFiltro, setCarreraFiltro] = useState('')
  const [semestreFiltro, setSemestreFiltro] = useState('')

  const semestresDisponibles = useMemo(() => {
    const s = new Set<number>()
    for (const c of estructura) {
      if (carreraFiltro && c.carreraId !== carreraFiltro) continue
      for (const { semestre } of c.semestres) s.add(semestre)
    }
    return [...s].sort((a, b) => a - b)
  }, [estructura, carreraFiltro])

  // Estructura acotada por Carrera/Semestre — sirve tanto para las opciones del select
  // de Grupo (cascada) como para la lista final.
  const estructuraPorFiltros = useMemo(() => estructura
    .filter(c => !carreraFiltro || c.carreraId === carreraFiltro)
    .map(c => ({
      ...c,
      semestres: c.semestres.filter(s => !semestreFiltro || s.semestre === Number(semestreFiltro)),
    }))
    .filter(c => c.semestres.length > 0),
  [estructura, carreraFiltro, semestreFiltro])

  const [vista, setVista] = useViewMode('calificaciones-grupos', 'cards')

  // Filas planas (una por grupo) para la vista de tabla — mismo orden carrera → semestre → grupo.
  // Si ya hay un grupo elegido en el selector de arriba, la lista se acota a ese grupo
  // en vez de seguir mostrando todos — para que el selector realmente funcione como filtro.
  const filas = useMemo(
    () => estructuraPorFiltros.flatMap(({ carrera, semestres }) =>
      semestres.flatMap(({ semestre, grupos: gs }) => gs.map(g => ({ carrera, semestre, grupo: g })))
    ).filter(({ grupo: g }) => !grupoId || g.id === grupoId),
    [estructuraPorFiltros, grupoId]
  )

  // Filas planas, una por ASIGNATURA de cada grupo (no una por grupo con badges), con
  // los datos completos de la carga académica — para que la vista de lista sirva como
  // tabla de consulta rápida sin tener que entrar a cada grupo.
  const filasMaterias = useMemo(
    () => filas.flatMap(({ carrera, semestre, grupo: g }) => {
      const materias = mergeCargasPorAsignatura(g.cargas ?? [])
      if (materias.length === 0) {
        return [{ carrera, semestre, grupo: g, carga: null as CargaAcademica | null }]
      }
      return materias.map(carga => ({ carrera, semestre, grupo: g, carga }))
    }),
    [filas]
  )

  // Búsqueda libre sobre grupo, materia y docente — insensible a mayúsculas/acentos,
  // para encontrar algo puntual sin recorrer visualmente toda la lista.
  const normaliza = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const filasBuscadas = useMemo(() => {
    const q = normaliza(busqueda.trim())
    if (!q) return filasMaterias
    return filasMaterias.filter(({ grupo: g, carga }) =>
      normaliza(g.clave).includes(q) ||
      normaliza(carga?.materia?.nombre ?? '').includes(q) ||
      normaliza(carga?.docente?.name ?? '').includes(q)
    )
  }, [filasMaterias, busqueda])

  // Agrupadas por carrera (en vez de repetir el nombre de la carrera en cada fila) para
  // que la tabla se lea como secciones claras y quede a la mano el botón de descarga
  // del PDF de calificaciones por carrera.
  const filasPorCarrera = useMemo(() => {
    const mapa = new Map<string, { carrera: string; carreraId?: string; filas: typeof filasBuscadas }>()
    for (const fila of filasBuscadas) {
      const key = fila.carrera
      if (!mapa.has(key)) mapa.set(key, { carrera: fila.carrera, carreraId: fila.grupo.carrera_id, filas: [] })
      mapa.get(key)!.filas.push(fila)
    }
    return [...mapa.values()]
  }, [filasBuscadas])

  // Misma acotación para la vista de tarjetas (Carrera/Semestre ya vienen aplicados en
  // estructuraPorFiltros; aquí solo se suma el filtro de Grupo).
  const estructuraFiltrada = useMemo(
    () => !grupoId
      ? estructuraPorFiltros
      : estructuraPorFiltros
          .map(({ carrera, semestres }) => ({
            carrera,
            semestres: semestres
              .map(({ semestre, grupos: gs }) => ({ semestre, grupos: gs.filter(g => g.id === grupoId) }))
              .filter(({ grupos: gs }) => gs.length > 0),
          }))
          .filter(({ semestres }) => semestres.length > 0),
    [estructuraPorFiltros, grupoId]
  )

  if (esDocente) return null // rama de docente manejada arriba

  const hayFiltros = !!carreraFiltro || !!semestreFiltro || !!grupoId

  return (
    <div className="space-y-4">
      {/* Fila 1 — filtros de ubicación (Carrera → Semestre → Grupo), en cascada: elegir uno
          acota las opciones de los siguientes. */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Carrera</label>
          <select
            value={carreraFiltro}
            onChange={e => {
              setCarreraFiltro(e.target.value)
              setSemestreFiltro('')
              onChange(null)
            }}
            className={`${inputCls} max-w-[220px]`}
            disabled={cargandoGrupos}
          >
            <option value="">Todas</option>
            {estructura.map(c => (
              <option key={c.carreraId ?? c.carrera} value={c.carreraId ?? ''}>{c.carrera}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Semestre</label>
          <select
            value={semestreFiltro}
            onChange={e => {
              setSemestreFiltro(e.target.value)
              onChange(null)
            }}
            className={`${inputCls} max-w-[130px]`}
            disabled={cargandoGrupos}
          >
            <option value="">Todos</option>
            {semestresDisponibles.map(s => (
              <option key={s} value={s}>{s}°</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Grupo</label>
          <select
            value={grupoId ?? ''}
            onChange={e => onChange(e.target.value ? { grupoId: e.target.value, cargaId: null } : null)}
            className={`${inputCls} max-w-md`}
            disabled={cargandoGrupos}
          >
            <option value="">{cargandoGrupos ? 'Cargando…' : 'Todos'}</option>
            {estructuraPorFiltros.map(({ carrera, semestres }) => (
              <optgroup key={carrera} label={carrera}>
                {semestres.flatMap(({ semestre, grupos: gs }) => gs.map(g => (
                  <option key={g.id} value={g.id}>
                    {semestre}° — Grupo {g.clave}
                  </option>
                )))}
              </optgroup>
            ))}
          </select>
        </div>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => { setCarreraFiltro(''); setSemestreFiltro(''); onChange(null) }}
            className="text-xs text-slate-500 hover:text-brand-600 hover:underline pb-2"
          >
            Quitar filtros
          </button>
        )}
      </div>

      {/* Fila 2 — buscador, vista y descarga: acciones sobre el resultado ya filtrado
          arriba, separadas para no competir visualmente con los filtros de ubicación. */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
        {vista === 'lista' && (
          <input
            type="search"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar grupo, materia o docente…"
            className={`${inputCls} max-w-xs`}
          />
        )}
        <ViewToggle value={vista} onChange={setVista} />
        <button
          type="button"
          onClick={() => descargarPdf(undefined, 'reporte_calificaciones.pdf')}
          disabled={descargando === 'reporte_calificaciones.pdf'}
          className="text-xs bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5 flex-shrink-0 ml-auto"
        >
          {descargando === 'reporte_calificaciones.pdf' ? 'Generando…' : '⬇ Descargar PDF (todo el periodo)'}
        </button>
      </div>

      {/* Todos los grupos listados por carrera → semestre → grupo, con la asignatura(s)
          de cada grupo visible directamente — un clic en la asignatura abre, en su propia
          página, la captura de calificaciones ya con esa materia elegida. */}
      {cargandoGrupos ? (
        <p className="text-sm text-slate-400">Cargando grupos…</p>
      ) : estructura.length === 0 ? (
        <p className="text-sm text-slate-400">No hay grupos registrados en este periodo.</p>
      ) : estructuraFiltrada.length === 0 ? (
        <p className="text-sm text-slate-400">El grupo seleccionado no coincide con ninguno de este periodo.</p>
      ) : vista === 'lista' ? (
        filasBuscadas.length === 0 ? (
          <p className="text-sm text-slate-400">Nada coincide con "{busqueda}".</p>
        ) : (
        <div className="space-y-4">
          <p className="sm:hidden text-[11px] text-slate-400">← Desliza cada tabla para ver todos los datos →</p>
          {filasPorCarrera.map(({ carrera, carreraId, filas: filasCarrera }) => (
            <div key={carrera} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between gap-3 bg-slate-50 border-b border-slate-200 px-4 py-2.5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{carrera}</h3>
                  <p className="text-[11px] text-slate-400">
                    {new Set(filasCarrera.map(f => f.grupo.id)).size} grupo(s) · {filasCarrera.filter(f => f.carga).length} asignatura(s)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => descargarPdf(carreraId, `calificaciones_${carrera.replace(/\s+/g, '_')}.pdf`)}
                  disabled={descargando === `calificaciones_${carrera.replace(/\s+/g, '_')}.pdf`}
                  className="text-xs bg-white border border-slate-300 text-slate-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50 flex-shrink-0"
                >
                  {descargando === `calificaciones_${carrera.replace(/\s+/g, '_')}.pdf` ? 'Generando…' : '⬇ PDF'}
                </button>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-white border-b border-slate-100">
                  <tr>
                    <Th>Semestre</Th>
                    <Th>Grupo</Th>
                    <Th>Alumnos</Th>
                    <Th>Materia</Th>
                    <Th>Docente</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filasCarrera.map(({ semestre, grupo: g, carga }) => {
                    const activo = grupoId === g.id && (!carga || cargaId === carga.id)
                    const filaId = `${g.id}-${carga?.id ?? 'sin-materia'}`
                    const expandida = filaExpandida === filaId
                    const dias: Record<string, string> = {
                      lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
                    }
                    const horario = (carga?.horarios ?? [])
                      .map(h => `${dias[h.dia_semana] ?? h.dia_semana} ${h.hora_inicio.slice(0, 5)}–${h.hora_fin.slice(0, 5)}`)
                      .join(' · ')
                    const estadoEtiqueta: Record<string, string> = {
                      confirmada: 'Confirmada', pendiente: 'Pendiente', conflicto: 'Conflicto',
                    }
                    const estadoClase: Record<string, string> = {
                      confirmada: 'bg-green-100 text-green-700',
                      pendiente: 'bg-amber-100 text-amber-700',
                      conflicto: 'bg-red-100 text-red-700',
                    }
                    return (
                      <Fragment key={filaId}>
                        <tr
                          onClick={() => carga && setFilaExpandida(expandida ? null : filaId)}
                          className={`${carga ? 'cursor-pointer' : ''} ${activo ? 'bg-brand-50/50' : 'hover:bg-slate-50'}`}
                        >
                          <td className="px-4 py-2.5 text-slate-600">{semestre}°</td>
                          <td className="px-4 py-2.5">
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); onChange({ grupoId: g.id, cargaId: null }) }}
                              className="font-medium text-slate-800 hover:text-brand-600 hover:underline"
                            >
                              {g.clave}
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{g.alumnos_count ?? 0}</td>
                          {carga ? (
                            <>
                              <td className="px-4 py-2.5">
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); onAbrirCaptura({ grupoId: g.id, cargaId: carga.id }) }}
                                  className="text-[13px] font-medium text-brand-600 hover:underline text-left"
                                >
                                  {carga.materia?.nombre ?? 'Materia'}
                                </button>
                              </td>
                              <td className="px-4 py-2.5 text-slate-600">{carga.docente?.name ?? '—'}</td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={`text-slate-400 inline-block transition-transform ${expandida ? 'rotate-180' : ''}`}>⌄</span>
                              </td>
                            </>
                          ) : (
                            <td colSpan={3} className="px-4 py-2.5 text-xs text-slate-400 italic">Sin materias asignadas</td>
                          )}
                        </tr>
                        {expandida && carga && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={6} className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-xs">
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px]">Periodo</div>
                                  <div className="text-slate-700">{g.periodo?.nombre ?? '—'}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px]">Turno</div>
                                  <div className="text-slate-700 capitalize">{g.turno ?? '—'}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px]">Hrs/sem</div>
                                  <div className="text-slate-700">{carga.horas_semana ?? '—'}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px]">Aula</div>
                                  <div className="text-slate-700">{carga.aula?.nombre ?? '—'}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px]">Horario</div>
                                  <div className="text-slate-700">{horario || '—'}</div>
                                </div>
                                <div>
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px]">Estado</div>
                                  {carga.estado ? (
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${estadoClase[carga.estado] ?? 'bg-slate-100 text-slate-600'}`}>
                                      {estadoEtiqueta[carga.estado] ?? carga.estado}
                                    </span>
                                  ) : <div className="text-slate-700">—</div>}
                                </div>
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); onAbrirCaptura({ grupoId: g.id, cargaId: carga.id }) }}
                                  className="ml-auto text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-[#15304c]"
                                >
                                  Revisar calificaciones →
                                </button>
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
            </div>
          ))}
        </div>
        )
      ) : (
        <div className="space-y-5">
          {estructuraFiltrada.map(({ carrera, semestres }) => (
            <div key={carrera}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{carrera}</p>
              <div className="space-y-3">
                {semestres.map(({ semestre, grupos: gs }) => (
                  <div key={semestre}>
                    <p className="text-xs font-medium text-slate-400 mb-1.5">{semestre}° semestre</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {gs.map(g => {
                        // Una materia repartida en varios días genera una CargaAcademica distinta
                // por cada bloque de horario — se fusionan para no listarla repetida.
                const materias = mergeCargasPorAsignatura(g.cargas ?? [])
                        const activo = grupoId === g.id
                        return (
                          <div
                            key={g.id}
                            className={`rounded-lg border p-2.5 ${activo ? 'border-brand-600 ring-1 ring-brand-600/30' : 'border-slate-200'}`}
                          >
                            <button
                              type="button"
                              onClick={() => onChange({ grupoId: g.id, cargaId: null })}
                              className="flex items-center justify-between w-full text-left mb-1.5"
                            >
                              <span className="text-sm font-semibold text-slate-800">Grupo {g.clave}</span>
                              <span className="text-[11px] text-slate-400 shrink-0">
                                {g.alumnos_count ?? 0} alumno{g.alumnos_count === 1 ? '' : 's'}
                              </span>
                            </button>
                            {materias.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">Sin materias asignadas</p>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {materias.map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => onAbrirCaptura({ grupoId: g.id, cargaId: c.id })}
                                    className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                                      activo && cargaId === c.id
                                        ? 'bg-brand-600 text-white border-brand-600'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {c.materia?.nombre ?? 'Materia'}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function CalificacionesPage() {
  const { user } = useAuthStore()
  const { data: periodoActivo } = usePeriodoActivo()
  const navigate = useNavigate()
  // El periodo/grupo elegidos viven en la URL (no solo en estado local) para que este
  // listado sea enlazable, recargable y navegable con atrás/adelante. Al elegir una
  // materia concreta se navega a su propia página de captura (ver `onAbrirCaptura`).
  const [searchParams, setSearchParams] = useSearchParams()
  const grupoId = searchParams.get('grupo_id')
  const cargaId = searchParams.get('carga_id')
  const periodoId = searchParams.get('periodo_id') ?? ''

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos-lista'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; activo?: boolean }[]),
  })

  // El periodo activo se toma como valor inicial en cuanto se conoce, pero el usuario
  // puede elegir cualquier otro periodo desde el selector de arriba.
  useEffect(() => {
    if (!periodoId && periodoActivo?.id) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('periodo_id', periodoActivo.id)
        return next
      }, { replace: true })
    }
  }, [periodoId, periodoActivo, setSearchParams])

  const esDocente = !!user?.roles.includes('docente') && !user?.roles.some(r => ['superadmin', 'admin'].includes(r))

  const rutaCaptura = esDocente ? '/docente/calificaciones/captura' : '/admin/gestion-academica/calificaciones/captura'

  // El selector de Periodo se mantiene colapsado por defecto (solo un renglón de texto)
  // porque casi siempre se trabaja con el periodo activo, que ya se autoselecciona
  // arriba — no hace falta ocupar espacio con un combo que rara vez se toca. Solo se
  // expande a pedido ("Cambiar") o si por algún motivo no hay periodo aún elegido.
  const [editandoPeriodo, setEditandoPeriodo] = useState(false)
  const periodoActual = periodos.find(p => p.id === periodoId)

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Captura de Calificaciones</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {esDocente
                ? 'Selecciona una de tus materias asignadas para abrir la captura de calificaciones de tus alumnos.'
                : 'Selecciona un periodo y da clic en una asignatura para abrir su captura de calificaciones.'}
            </p>
          </div>
          {!esDocente && (
            <button
              type="button"
              onClick={() => navigate(periodoId ? `/admin/gestion-academica/calificaciones/estadisticas?periodo_id=${periodoId}` : '/admin/gestion-academica/calificaciones/estadisticas')}
              className="text-sm bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-[#15304c] inline-flex items-center gap-1.5 flex-shrink-0"
            >
              📊 Estadísticas y KPIs
            </button>
          )}
        </div>

        {editandoPeriodo || !periodoId ? (
          <div className="bg-white rounded-xl border border-slate-200 p-4 max-w-xs">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Periodo *</label>
            <select
              value={periodoId}
              onChange={e => {
                const v = e.target.value
                setSearchParams(v ? { periodo_id: v } : {})
                if (v) setEditandoPeriodo(false)
              }}
              className={selectCls}
              autoFocus
            >
              <option value="">— Selecciona —</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (activo)' : ''}</option>)}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Periodo:</span>
            <span className="font-medium text-slate-800">
              {periodoActual?.nombre ?? '—'}{periodoActual?.activo && <span className="text-emerald-600"> (activo)</span>}
            </span>
            <button
              type="button"
              onClick={() => setEditandoPeriodo(true)}
              className="text-xs text-slate-400 hover:text-brand-600 hover:underline ml-1"
            >
              Cambiar
            </button>
          </div>
        )}

        {!periodoId ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">Selecciona un periodo académico para comenzar.</p>
          </div>
        ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <SelectorGrupo
            esDocente={esDocente}
            currentUserId={user?.id}
            periodoId={periodoId}
            grupoId={grupoId}
            cargaId={cargaId}
            onChange={seleccion => {
              setSearchParams(prev => {
                const next = new URLSearchParams(prev)
                if (seleccion) {
                  next.set('grupo_id', seleccion.grupoId)
                  if (seleccion.cargaId) next.set('carga_id', seleccion.cargaId)
                  else next.delete('carga_id')
                } else {
                  next.delete('grupo_id')
                  next.delete('carga_id')
                }
                return next
              })
            }}
            onAbrirCaptura={seleccion => {
              const params = new URLSearchParams()
              if (periodoId) params.set('periodo_id', periodoId)
              params.set('grupo_id', seleccion.grupoId)
              params.set('carga_id', seleccion.cargaId)
              navigate(`${rutaCaptura}?${params.toString()}`)
            }}
          />
        </div>
        )}
      </div>
    </div>
  )
}

// Evita que se capturen calificaciones fuera de 0-100 (deja pasar valores vacíos o a
// medio escribir, p. ej. "-" o "" mientras el usuario sigue tecleando).
function clampCalificacion(valor: string): string {
  if (valor === '' || valor === '-') return valor
  const num = Number(valor)
  if (isNaN(num)) return valor
  if (num < 0) return '0'
  if (num > 100) return '100'
  return valor
}

// ── Historial de ediciones de calificaciones (auditoría) ──────────────────────
function fmtParciales(parciales: { parcial: number; calificacion: number }[] | null) {
  if (!parciales || parciales.length === 0) return '—'
  return parciales.map(p => `P${p.parcial}: ${p.calificacion}`).join(', ')
}

// ── Detalle de desempeño académico del alumno (calificaciones + asistencia + alertas) ──
function DetalleAlumnoModal({ alumnoId, nombre, promedioGrupo, onClose }: {
  alumnoId: string
  nombre: string
  /** Promedio anónimo del grupo/materia desde la que se abrió el detalle (si aplica), para comparar. */
  promedioGrupo?: number | null
  onClose: () => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['situacion-academica', alumnoId],
    queryFn: () => academicoApi.getSituacionAcademica(alumnoId),
  })

  const asistencia = data?.resumen_asistencia
  const porcentajeAsistencia = asistencia && asistencia.total > 0
    ? Math.round(((asistencia.presentes + asistencia.justificados) / asistencia.total) * 100)
    : null

  const promediosValidos = (data?.calificaciones ?? [])
    .map(c => c.promedio != null ? Number(c.promedio) : null)
    .filter((p): p is number => p != null && !isNaN(p))
  const promedioGeneral = promediosValidos.length > 0
    ? Math.round((promediosValidos.reduce((a, b) => a + b, 0) / promediosValidos.length) * 100) / 100
    : null

  return (
    <Modal title={`Desempeño académico · ${nombre}`} onClose={onClose} size="lg">
      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-6">Cargando…</p>
      ) : (
        <div className="space-y-5">
          <div className="flex justify-end">
            <Link to={`/admin/alumnos/${alumnoId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">
              Ver expediente completo →
            </Link>
          </div>

          {(promedioGeneral != null || promedioGrupo != null) && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Comparativo de promedio</p>
              <div className="flex items-center gap-6 flex-wrap bg-slate-50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-lg font-bold text-slate-800">{promedioGeneral ?? '—'}</p>
                  <p className="text-[10px] text-slate-400 uppercase">Promedio general del alumno</p>
                </div>
                {promedioGrupo != null && (
                  <>
                    <div>
                      <p className="text-lg font-bold text-slate-400">{promedioGrupo.toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400 uppercase">Promedio anónimo del grupo (esta materia)</p>
                    </div>
                    {promedioGeneral != null && (
                      <span className={`text-sm font-semibold ${promedioGeneral >= promedioGrupo ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {promedioGeneral >= promedioGrupo ? '▲' : '▼'} {Math.abs(Math.round((promedioGeneral - promedioGrupo) * 10) / 10)} pts
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {asistencia && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Asistencia (histórico, todas las materias)</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-slate-800">{porcentajeAsistencia ?? '—'}%</p>
                  <p className="text-[10px] text-slate-400 uppercase">Asistencia</p>
                </div>
                <div className="bg-emerald-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-emerald-700">{asistencia.presentes}</p>
                  <p className="text-[10px] text-emerald-500 uppercase">Presentes</p>
                </div>
                <div className="bg-red-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-red-700">{asistencia.ausentes}</p>
                  <p className="text-[10px] text-red-500 uppercase">Ausentes</p>
                </div>
                <div className="bg-amber-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-amber-700">{asistencia.retardos}</p>
                  <p className="text-[10px] text-amber-500 uppercase">Retardos</p>
                </div>
                <div className="bg-brand-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-brand-700">{asistencia.justificados}</p>
                  <p className="text-[10px] text-brand-500 uppercase">Justificados</p>
                </div>
              </div>
            </div>
          )}

          {data && data.alertas_baja_definitiva.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Alertas de baja definitiva</p>
              <div className="space-y-1.5">
                {data.alertas_baja_definitiva.map(al => (
                  <div key={al.id} className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700">
                    {al.materia_nombre} — intento {al.intento_numero}{al.revisada ? ' (revisada)' : ''}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Rendimiento académico por materia</p>
            {!data || data.calificaciones.length === 0 ? (
              <p className="text-sm text-slate-400">Sin calificaciones registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="text-left px-3 py-2">Materia</th>
                      <th className="text-left px-3 py-2">Periodo</th>
                      <th className="text-right px-3 py-2">Promedio</th>
                      <th className="text-left px-3 py-2">Estatus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.calificaciones.map(c => (
                      <tr key={c.id}>
                        <td className="px-3 py-2">{c.grupo?.cargas?.[0]?.materia?.nombre ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-500">{c.grupo?.periodo?.nombre ?? '—'}</td>
                        <td className="px-3 py-2 text-right font-medium">{c.promedio ?? '—'}</td>
                        <td className="px-3 py-2">
                          {c.calificacion_final != null && c.acreditado === true && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">APROBADO</span>}
                          {c.calificacion_final != null && c.acreditado === false && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">NO APROBADO</span>}
                          {c.calificacion_final == null && <span className="text-slate-300 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Importación masiva de calificaciones por CSV ────────────────────────────────
function ImportarCsvModal({ grupoId, cargaAcademicaId, onClose, onImportado }: {
  grupoId: string
  cargaAcademicaId: string
  onClose: () => void
  onImportado: () => void
}) {
  const { toast: addToast } = useToastStore()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<{ actualizados: number; errores: string[] } | null>(null)

  async function importar() {
    if (!archivo) return
    setImportando(true)
    setResultado(null)
    try {
      const r = await academicoApi.importarCalificacionesCsv(grupoId, cargaAcademicaId, archivo)
      setResultado(r)
      if (r.actualizados > 0) {
        addToast(`Se importaron ${r.actualizados} registro(s).`, 'success')
        onImportado()
      }
    } catch (e) {
      addToast(mutationError(e), 'error')
    } finally {
      setImportando(false)
    }
  }

  return (
    <Modal title="Importar calificaciones desde CSV" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <p className="text-slate-500">
          El archivo debe tener las mismas columnas que genera "Exportar CSV": No. Control, Alumno, P1…PN
          (Final, Promedio y Estatus se ignoran al importar). Los alumnos se identifican por su No. Control.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={e => { setArchivo(e.target.files?.[0] ?? null); setResultado(null) }}
          className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:text-xs file:font-medium hover:file:bg-slate-50"
        />
        {resultado && (
          <div className="space-y-2">
            <p className="text-emerald-700 font-medium">{resultado.actualizados} registro(s) importado(s) correctamente.</p>
            {resultado.errores.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 max-h-40 overflow-y-auto">
                {resultado.errores.map((err, i) => (
                  <p key={i} className="text-xs text-red-700">{err}</p>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
            Cerrar
          </button>
          <button
            onClick={importar}
            disabled={!archivo || importando}
            className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40"
          >
            {importando ? 'Importando…' : 'Importar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function HistorialCalificacionesModal({ grupoId, cargaAcademicaId, onClose }: {
  grupoId: string
  cargaAcademicaId: string | null
  onClose: () => void
}) {
  const [editorId, setEditorId] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const { data: historial = [], isLoading } = useQuery({
    queryKey: ['historial-calificaciones', grupoId, cargaAcademicaId, editorId, desde, hasta],
    queryFn: () => academicoApi.getHistorialCalificaciones(grupoId, {
      carga_academica_id: cargaAcademicaId,
      editado_por: editorId || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
    }),
  })

  // Lista de editores para el filtro — se pide sin filtrar (aparte del query principal)
  // para que las opciones del <select> no se reduzcan a medida que se filtra.
  const { data: historialCompleto = [] } = useQuery({
    queryKey: ['historial-calificaciones-editores', grupoId, cargaAcademicaId],
    queryFn: () => academicoApi.getHistorialCalificaciones(grupoId, { carga_academica_id: cargaAcademicaId }),
  })
  const editores = useMemo(() => {
    const m = new Map<string, string>()
    historialCompleto.forEach(h => { if (h.editor) m.set(h.editor.id, h.editor.name) })
    return [...m.entries()]
  }, [historialCompleto])

  return (
    <Modal title="Historial de calificaciones" onClose={onClose} size="lg">
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={editorId} onChange={e => setEditorId(e.target.value)} className={`${selectCls} max-w-[200px]`}>
          <option value="">Todos los editores</option>
          {editores.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
        </select>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className={inputCls} title="Desde" />
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className={inputCls} title="Hasta" />
        {(editorId || desde || hasta) && (
          <button onClick={() => { setEditorId(''); setDesde(''); setHasta('') }} className="text-xs text-slate-500 hover:underline">
            Limpiar filtros
          </button>
        )}
      </div>
      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-6">Cargando…</p>
      ) : historial.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Sin ediciones registradas con estos filtros.</p>
      ) : (
        <div className="space-y-2">
          {historial.map(h => (
            <div key={h.id} className="border border-slate-200 rounded-lg px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="font-medium text-slate-800">{h.alumno?.user?.name ?? h.alumno_id}</span>
                <span className="text-xs text-slate-400">
                  {new Date(h.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Editado por <span className="font-medium">{h.editor?.name ?? '—'}</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs">
                <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                  <p className="text-slate-400 uppercase tracking-wide text-[10px] mb-0.5">Antes</p>
                  <p className="text-slate-600">{fmtParciales(h.parciales_anteriores)}</p>
                  {h.calificacion_final_anterior != null && <p className="text-slate-600">Final: {h.calificacion_final_anterior}</p>}
                </div>
                <div className="bg-brand-50 rounded-lg px-2.5 py-2">
                  <p className="text-brand-400 uppercase tracking-wide text-[10px] mb-0.5">Después</p>
                  <p className="text-brand-700">{fmtParciales(h.parciales_nuevos)}</p>
                  {h.calificacion_final_nueva != null && <p className="text-brand-700">Final: {h.calificacion_final_nueva}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ── Sección calificaciones ────────────────────────────────────────────────────

export function CalificacionesSection({
  grupoId,
  alumnos,
  cargas,
  currentUserId,
  periodoId,
  periodoActivo,
  esDocente,
  puedeFirmar,
  cargaPreseleccionadaId = null,
  unidadDestacada = null,
  puedeEditarFinal = false,
  puedeVerHistorial = false,
}: {
  grupoId: string
  alumnos: AlumnoRow[]
  cargas: CargaAcademica[]
  currentUserId?: string
  periodoId: string
  periodoActivo: boolean
  esDocente: boolean
  puedeFirmar: boolean
  /** Materia ya elegida en el selector de arriba (flujo docente) — evita pedirla de nuevo aquí. */
  cargaPreseleccionadaId?: string | null
  /** Unidad a la que hay que llevar la vista (llegando desde "Calendarización de evaluación"). */
  unidadDestacada?: number | null
  /** Solo el superadmin puede capturar/editar la calificación final directamente. */
  puedeEditarFinal?: boolean
  /** DA, Jefatura, Control Escolar, Subdirección/Dirección Académica, Dirección General, superadmin. */
  puedeVerHistorial?: boolean
}) {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [confirmCierre, setConfirmCierre] = useState(false)
  const [confirmFirma, setConfirmFirma] = useState(false)
  const [confirmReabrir, setConfirmReabrir] = useState(false)
  const [motivoReabrir, setMotivoReabrir] = useState('')
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [detalleAlumnoId, setDetalleAlumnoId] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)
  const [generandoActa, setGenerandoActa] = useState(false)
  const [mostrarImportar, setMostrarImportar] = useState(false)

  async function exportarCsv() {
    if (!cargaSeleccionadaId) return
    setExportando(true)
    try {
      const nombreMateria = cargaSeleccionada?.materia?.nombre ?? 'calificaciones'
      await academicoApi.exportarCalificacionesCsv(grupoId, cargaSeleccionadaId, `acta_${nombreMateria}.csv`)
    } catch (e) {
      addToast(mutationError(e), 'error')
    } finally {
      setExportando(false)
    }
  }

  // Toda la cuadrícula es editable a la vez (no fila por fila) — el docente revisa y
  // corrige lo que necesite y guarda todo con un solo botón. `edits`/`editsFinal`/
  // `editsOportunidad` llevan el valor "en edición" de cada alumno; se re-inicializan
  // desde el servidor cada vez que cambian los datos (abrir la materia, o tras guardar).
  const [edits, setEdits] = useState<Record<string, Record<number, string>>>({})
  const [editsFinal, setEditsFinal] = useState<Record<string, string>>({})
  const [editsOportunidad, setEditsOportunidad] = useState<Record<string, 'primera_oportunidad' | 'segunda_oportunidad'>>({})
  const [guardandoTodo, setGuardandoTodo] = useState(false)
  // Una vez que ya hay calificaciones asentadas, la cuadrícula se muestra en solo lectura
  // (para no invitar a "corregir de pasada" sin querer) — el docente debe abrir
  // explícitamente la columna del tema que necesita actualizar con "Editar"; las demás
  // columnas quedan bloqueadas mientras tanto. Si se llega desde "Calendarización de
  // evaluación" con una unidad específica, esa columna arranca ya abierta.
  const [columnaEditable, setColumnaEditable] = useState<number | null>(unidadDestacada ?? null)

  // Un grupo puede agrupar varias materias (cargas académicas); un docente solo
  // captura las suyas, un administrador puede elegir cuál materia calificar. Se
  // fusionan antes las cargas repetidas de una misma materia (repartida en varios
  // días de la semana) para no ofrecerla duplicada ni dispersar sus calificaciones
  // bajo distintos carga_academica_id.
  const cargasFusionadas = useMemo(() => mergeCargasPorAsignatura(cargas), [cargas])
  const cargasDisponibles = useMemo(
    () => (esDocente ? cargasFusionadas.filter(c => c.docente_id === currentUserId) : cargasFusionadas),
    [cargasFusionadas, esDocente, currentUserId]
  )

  const [cargaSeleccionadaId, setCargaSeleccionadaId] = useState<string | null>(null)
  const cargaSeleccionada = cargasDisponibles.find(c => c.id === cargaSeleccionadaId)

  // Acta imprimible con firma del docente y de Control Escolar — a diferencia del acta
  // oficial de Cierre de Curso, esta se puede generar en cualquier momento como comprobante
  // de lo capturado hasta ahora (no requiere cerrar el curso).
  async function generarActa() {
    if (!cargaSeleccionadaId) return
    setGenerandoActa(true)
    try {
      const nombreMateria = cargaSeleccionada?.materia?.nombre ?? 'calificaciones'
      await academicoApi.descargarActaCalificaciones(grupoId, cargaSeleccionadaId, `acta_${nombreMateria}.pdf`)
      await qc.invalidateQueries({ queryKey: ['acta-calificaciones-captura-estado', grupoId, cargaSeleccionadaId] })
    } catch (e) {
      addToast(mutationError(e), 'error')
    } finally {
      setGenerandoActa(false)
    }
  }

  const [generandoActaExcel, setGenerandoActaExcel] = useState(false)
  async function generarActaExcel() {
    if (!cargaSeleccionadaId) return
    setGenerandoActaExcel(true)
    try {
      const nombreMateria = cargaSeleccionada?.materia?.nombre ?? 'calificaciones'
      await academicoApi.descargarActaCalificacionesExcel(grupoId, cargaSeleccionadaId, `acta_${nombreMateria}.xlsx`)
      await qc.invalidateQueries({ queryKey: ['acta-calificaciones-captura-estado', grupoId, cargaSeleccionadaId] })
    } catch (e) {
      addToast(mutationError(e), 'error')
    } finally {
      setGenerandoActaExcel(false)
    }
  }

  // Estado del acta de captura (folio, quién y cuándo la generó/firmó) — para mostrar el
  // botón "Firmar acta" solo a quien puede (control_escolar/admin/superadmin) y una vez
  // que ya existe un acta generada.
  const { data: estadoActa } = useQuery({
    queryKey: ['acta-calificaciones-captura-estado', grupoId, cargaSeleccionadaId],
    queryFn: () => academicoApi.obtenerEstadoActaCalificaciones(grupoId, cargaSeleccionadaId!),
    enabled: !!cargaSeleccionadaId,
  })

  const mutFirmarActaCaptura = useMutation({
    mutationFn: () => academicoApi.firmarActaCalificacionesCaptura(grupoId, cargaSeleccionadaId!),
    onSuccess: () => {
      addToast('Acta firmada.', 'success')
      qc.invalidateQueries({ queryKey: ['acta-calificaciones-captura-estado', grupoId, cargaSeleccionadaId] })
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  // Las unidades a capturar (cantidad, nombre y % de la calificación final) deben
  // coincidir con la instrumentación didáctica (planeación) que el docente entregó
  // para esta materia y periodo — no un valor fijo ni el temario genérico.
  //
  // La planeación se guarda contra UN carga_academica_id específico (el que estaba
  // activo cuando el docente la creó), que no necesariamente es el "canónico" que
  // mergeCargasPorAsignatura eligió arriba para esta materia+grupo (si está repartida
  // en varios bloques día/hora, cada bloque tiene su propio id y el docente pudo haber
  // guardado la instrumentación contra cualquiera de ellos). Filtrar solo por el id
  // canónico puede no encontrar nada aunque sí exista una planeación — por eso se pide
  // por docente+periodo (sin acotar por carga) y se busca entre los resultados la que
  // corresponda a cualquiera de los ids del mismo grupo materia+grupo.
  const idsCargaSeleccionada = useMemo(() => {
    if (!cargaSeleccionada) return []
    const grupoDeLaCarga = cargaSeleccionada.grupos?.[0]?.id
    return cargas
      .filter(c => c.materia_id === cargaSeleccionada.materia_id && c.grupos?.[0]?.id === grupoDeLaCarga)
      .map(c => c.id)
  }, [cargas, cargaSeleccionada])

  const { data: planeacionesData } = useQuery({
    queryKey: ['planeacion-para-calificaciones', cargaSeleccionada?.docente_id, periodoId],
    queryFn: () => academicoApi.getPlaneaciones({ docente_id: cargaSeleccionada!.docente_id, periodo_id: periodoId }),
    enabled: !!cargaSeleccionada && !!periodoId,
  })
  const planeacion = (planeacionesData?.data ?? []).find(
    (p: { carga_academica_id: string }) => idsCargaSeleccionada.includes(p.carga_academica_id)
  ) as { competencias?: { numero: number; nombre_unidad: string; porcentaje: number | null }[] } | undefined
  const unidadesPlaneacion = useMemo(
    () => (planeacion?.competencias ?? []).slice().sort((a, b) => a.numero - b.numero),
    [planeacion]
  )

  const numParciales = unidadesPlaneacion.length || cargaSeleccionada?.materia?.temario?.length || 3
  const numerosParciales = useMemo(
    () => Array.from({ length: numParciales }, (_, i) => i + 1),
    [numParciales]
  )
  const nombreUnidad = (n: number) => unidadesPlaneacion.find(u => u.numero === n)?.nombre_unidad
  // % que la unidad aporta a la calificación final, tal como lo definió el docente en su
  // instrumentación didáctica — se usa para mostrar, junto a cada parcial capturado, su
  // equivalente ya ponderado (p. ej. unidad al 25%: 100 → 25, 70 → 17.5).
  const pesoUnidad = (n: number): number | null => unidadesPlaneacion.find(u => u.numero === n)?.porcentaje ?? null
  const equivalentePonderado = (valor: string, n: number): string => {
    const peso = pesoUnidad(n)
    const num = Number(valor)
    if (peso == null || valor === '' || isNaN(num)) return '—'
    return (num * peso / 100).toFixed(2)
  }

  useEffect(() => {
    if (cargaPreseleccionadaId && cargasDisponibles.some(c => c.id === cargaPreseleccionadaId)) {
      setCargaSeleccionadaId(cargaPreseleccionadaId)
    } else if (cargasDisponibles.length === 1) {
      setCargaSeleccionadaId(cargasDisponibles[0].id)
    } else if (!cargasDisponibles.some(c => c.id === cargaSeleccionadaId)) {
      setCargaSeleccionadaId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargasDisponibles, cargaPreseleccionadaId])

  // Llegando desde "Calendarización de evaluación" con una unidad específica: llevar la
  // vista a su columna en cuanto la tabla ya tiene datos (alumnos cargados).
  useEffect(() => {
    if (!unidadDestacada || alumnos.length === 0) return
    const el = document.getElementById(`col-parcial-${unidadDestacada}`)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [unidadDestacada, alumnos.length, cargaSeleccionadaId])

  const { data: calificaciones = [], isLoading } = useQuery({
    queryKey: ['calificaciones-grupo', grupoId],
    queryFn: () => academicoApi.getCalificacionesGrupo(grupoId),
  })

  // Cortes de captura del periodo — para avisar en la cabecera de cada parcial si su
  // fecha límite ya venció (solo un admin/director puede seguir capturando después).
  const { data: cortesCaptura = [] } = useQuery({
    queryKey: ['cortes-captura', periodoId],
    queryFn: () => academicoApi.getCortesCaptura(periodoId),
    enabled: !!periodoId,
  })
  const corteDe = (n: number) => cortesCaptura.find(c => c.numero === n)
  const corteVencido = (n: number) => {
    const corte = corteDe(n)
    return !!corte && new Date(corte.fecha_limite_captura) < new Date(new Date().toDateString())
  }

  const calMap = useMemo(() => {
    const m: Record<string, Calificacion> = {}
    calificaciones
      .filter(c => c.carga_academica_id === cargaSeleccionadaId)
      .forEach(c => { m[c.alumno_id] = c })
    return m
  }, [calificaciones, cargaSeleccionadaId])

  // Promedio anónimo del grupo en esta materia — para el comparativo del detalle del
  // alumno (no expone la calificación de ningún compañero en particular).
  const promedioGrupoMateria = useMemo(() => {
    const valores = Object.values(calMap).map(c => c.promedio != null ? Number(c.promedio) : null).filter((p): p is number => p != null && !isNaN(p))
    return valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : null
  }, [calMap])

  // Reinicia el formulario "en edición" desde el servidor — al abrir la materia, cambiar
  // de unidad destacada, o justo después de guardar (para reflejar lo recién persistido
  // y limpiar el estado "modificado" de las filas ya guardadas).
  useEffect(() => {
    const nuevo: Record<string, Record<number, string>> = {}
    const nuevoFinal: Record<string, string> = {}
    const nuevaOportunidad: Record<string, 'primera_oportunidad' | 'segunda_oportunidad'> = {}
    alumnos.forEach(a => {
      const cal = calMap[a.id]
      const fila: Record<number, string> = {}
      numerosParciales.forEach(n => {
        fila[n] = String(cal?.parciales?.find(p => p.parcial === n)?.calificacion ?? '')
      })
      nuevo[a.id] = fila
      nuevoFinal[a.id] = cal?.calificacion_final != null ? String(cal.calificacion_final) : ''
      nuevaOportunidad[a.id] = cal?.oportunidad === 'segunda_oportunidad' ? 'segunda_oportunidad' : 'primera_oportunidad'
    })
    setEdits(nuevo)
    setEditsFinal(nuevoFinal)
    setEditsOportunidad(nuevaOportunidad)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnos, calMap, numerosParciales.length])

  function filaModificada(alumnoId: string): boolean {
    const cal = calMap[alumnoId]
    const rowEdits = edits[alumnoId]
    const parcialesModificados = numerosParciales.some(n => {
      const val = rowEdits?.[n] ?? ''
      const original = cal?.parciales?.find(p => p.parcial === n)?.calificacion
      return val !== (original != null ? String(original) : '')
    })
    const finalOriginal = cal?.calificacion_final != null ? String(cal.calificacion_final) : ''
    const finalModificado = puedeEditarFinal && (editsFinal[alumnoId] ?? '') !== finalOriginal
    return parcialesModificados || finalModificado
  }

  const alumnosModificados = useMemo(() => alumnos.filter(a => filaModificada(a.id)), [alumnos, edits, editsFinal])

  async function guardarTodo() {
    if (!cargaSeleccionadaId || alumnosModificados.length === 0) return
    setGuardandoTodo(true)
    try {
      await Promise.all(alumnosModificados.map(a => {
        const rowEdits = edits[a.id] ?? {}
        const parciales = numerosParciales
          .map(n => ({ parcial: n, calificacion: Number(rowEdits[n]) }))
          .filter(p => !isNaN(p.calificacion) && String(rowEdits[p.parcial] ?? '') !== '')

        const finalStr = editsFinal[a.id] ?? ''
        const finalNum = Number(finalStr)
        const calificacion_final = puedeEditarFinal && !isNaN(finalNum) && finalStr !== '' ? finalNum : undefined

        return academicoApi.registrarCalificacion({
          alumno_id: a.id,
          grupo_id: grupoId,
          carga_academica_id: cargaSeleccionadaId,
          parciales,
          calificacion_final,
          oportunidad: calificacion_final !== undefined ? editsOportunidad[a.id] : undefined,
        })
      }))
      qc.invalidateQueries({ queryKey: ['calificaciones-grupo', grupoId] })
      addToast(`Se guardaron ${alumnosModificados.length} registro(s).`, 'success')
    } catch (e) {
      addToast(mutationError(e), 'error')
    } finally {
      setGuardandoTodo(false)
    }
  }

  const cerrarMut = useMutation({
    mutationFn: () => academicoApi.cerrarCurso(grupoId, periodoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupo-detalle-calificaciones', grupoId] })
      addToast('Curso cerrado. Las calificaciones ya no pueden modificarse.', 'success')
      setConfirmCierre(false)
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  const firmarMut = useMutation({
    mutationFn: () => academicoApi.firmarActa(grupoId, cargaSeleccionadaId ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupo-detalle-calificaciones', grupoId] })
      addToast('Acta firmada e integrada al libro de actas.', 'success')
      setConfirmFirma(false)
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  const reabrirMut = useMutation({
    mutationFn: () => academicoApi.reabrirCurso(grupoId, periodoId, motivoReabrir),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grupo-detalle-calificaciones', grupoId] })
      qc.invalidateQueries({ queryKey: ['calificaciones-grupo', grupoId] })
      addToast('Curso reabierto. Las calificaciones vuelven a ser editables.', 'success')
      setConfirmReabrir(false)
      setMotivoReabrir('')
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900 text-sm">Calificaciones</h2>
        {cargasDisponibles.length > 1 && !cargaPreseleccionadaId && (
          <select
            value={cargaSeleccionadaId ?? ''}
            onChange={e => setCargaSeleccionadaId(e.target.value || null)}
            className={`${inputCls} max-w-xs`}
          >
            <option value="">Selecciona una materia…</option>
            {cargasDisponibles.map(c => (
              <option key={c.id} value={c.id}>{c.materia?.nombre ?? c.materia_id}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-2">
          {/* Pantallas pequeñas: todo salvo "Guardar" se agrupa en un menú desplegable —
              en fila, con tantas acciones condicionales, los botones se apilaban/cortaban. */}
          {(cargaSeleccionadaId || puedeVerHistorial || puedeFirmar) && (
            <details className="sm:hidden relative">
              <summary
                className="list-none cursor-pointer select-none text-xs bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1"
              >
                Más acciones
                <ChevronDown className="w-3 h-3" strokeWidth={2} aria-hidden="true" />
              </summary>
              <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 text-xs">
                {cargaSeleccionadaId && (
                  <button onClick={e => { exportarCsv(); e.currentTarget.closest('details')?.removeAttribute('open') }} disabled={exportando}
                    className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    {exportando ? 'Exportando…' : 'Exportar CSV'}
                  </button>
                )}
                {cargaSeleccionadaId && (
                  <button onClick={e => { generarActa(); e.currentTarget.closest('details')?.removeAttribute('open') }} disabled={generandoActa}
                    className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    {generandoActa ? 'Generando…' : 'Generar Acta (PDF)'}
                  </button>
                )}
                {cargaSeleccionadaId && (
                  <button onClick={e => { generarActaExcel(); e.currentTarget.closest('details')?.removeAttribute('open') }} disabled={generandoActaExcel}
                    className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    {generandoActaExcel ? 'Generando…' : 'Acta (Excel)'}
                  </button>
                )}
                {estadoActa?.puede_firmar && estadoActa.acta && !estadoActa.acta.firmado_en && (
                  <button onClick={e => { mutFirmarActaCaptura.mutate(); e.currentTarget.closest('details')?.removeAttribute('open') }} disabled={mutFirmarActaCaptura.isPending}
                    className="w-full text-left px-3 py-2 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50">
                    {mutFirmarActaCaptura.isPending ? 'Firmando…' : 'Firmar acta de captura'}
                  </button>
                )}
                {esDocente && cargaSeleccionadaId && (
                  <button onClick={e => { setMostrarImportar(true); e.currentTarget.closest('details')?.removeAttribute('open') }}
                    className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50">
                    Importar CSV
                  </button>
                )}
                {puedeVerHistorial && (
                  <button onClick={e => { setMostrarHistorial(true); e.currentTarget.closest('details')?.removeAttribute('open') }}
                    className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50">
                    Ver historial
                  </button>
                )}
                {puedeFirmar && !confirmFirma && !confirmCierre && !confirmReabrir && (
                  <>
                    <button onClick={e => { setConfirmCierre(true); e.currentTarget.closest('details')?.removeAttribute('open') }}
                      className="w-full text-left px-3 py-2 text-amber-700 hover:bg-amber-50">
                      Cerrar curso
                    </button>
                    <button onClick={e => { setConfirmReabrir(true); e.currentTarget.closest('details')?.removeAttribute('open') }}
                      className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50">
                      Reabrir curso
                    </button>
                    <button onClick={e => { setConfirmFirma(true); e.currentTarget.closest('details')?.removeAttribute('open') }}
                      className="w-full text-left px-3 py-2 text-slate-700 font-medium hover:bg-slate-50">
                      Firmar acta
                    </button>
                  </>
                )}
              </div>
            </details>
          )}

          {/* sm en adelante: misma fila de botones de siempre */}
          <div className="hidden sm:flex items-center gap-2">
            {cargaSeleccionadaId && (
              <button
                onClick={exportarCsv}
                disabled={exportando}
                className="text-xs bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {exportando ? 'Exportando…' : 'Exportar CSV'}
              </button>
            )}
            {cargaSeleccionadaId && (
              <button
                onClick={generarActa}
                disabled={generandoActa}
                title="Acta imprimible con firma del docente y de Control Escolar"
                className="text-xs bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {generandoActa ? 'Generando…' : 'Generar Acta (PDF)'}
              </button>
            )}
            {cargaSeleccionadaId && (
              <button
                onClick={generarActaExcel}
                disabled={generandoActaExcel}
                title="Acta de calificaciones en formato Excel"
                className="text-xs bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {generandoActaExcel ? 'Generando…' : 'Acta (Excel)'}
              </button>
            )}
            {estadoActa?.puede_firmar && estadoActa.acta && !estadoActa.acta.firmado_en && (
              <button
                onClick={() => mutFirmarActaCaptura.mutate()}
                disabled={mutFirmarActaCaptura.isPending}
                title={`Folio ${estadoActa.acta.folio}`}
                className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {mutFirmarActaCaptura.isPending ? 'Firmando…' : 'Firmar acta de captura'}
              </button>
            )}
            {esDocente && cargaSeleccionadaId && (
              <button
                onClick={() => setMostrarImportar(true)}
                className="text-xs bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Importar CSV
              </button>
            )}
            {puedeVerHistorial && (
              <button
                onClick={() => setMostrarHistorial(true)}
                className="text-xs bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Ver historial
              </button>
            )}
            {puedeFirmar && !confirmFirma && !confirmCierre && !confirmReabrir && (
              <>
                <button
                  onClick={() => setConfirmCierre(true)}
                  className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  Cerrar curso
                </button>
                <button
                  onClick={() => setConfirmReabrir(true)}
                  className="text-xs bg-white text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Reabrir curso
                </button>
                <button
                  onClick={() => setConfirmFirma(true)}
                  className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Firmar acta
                </button>
              </>
            )}
          </div>

          {/* "Guardar" siempre visible, en pantallas de cualquier tamaño */}
          {(esDocente || puedeEditarFinal) && (
            <button
              onClick={guardarTodo}
              disabled={guardandoTodo || alumnosModificados.length === 0}
              title={alumnosModificados.length === 0 ? 'No hay cambios sin guardar' : `Guardar ${alumnosModificados.length} registro(s) modificado(s)`}
              className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {guardandoTodo ? 'Guardando…' : `Guardar${alumnosModificados.length > 0 ? ` (${alumnosModificados.length})` : ''}`}
            </button>
          )}
        </div>
      </div>

      {cargaSeleccionadaId && estadoActa?.acta && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 px-1">
          <span>Folio: <strong className="text-slate-700">{estadoActa.acta.folio}</strong></span>
          <span>·</span>
          <span>Generada por {estadoActa.acta.generado_por_nombre ?? '—'} el {new Date(estadoActa.acta.generado_en).toLocaleString('es-MX')}</span>
          {estadoActa.acta.firmado_en ? (
            <span className="text-green-700 font-medium">✓ Firmada por {estadoActa.acta.firmado_por_nombre ?? 'Control Escolar'} el {new Date(estadoActa.acta.firmado_en).toLocaleString('es-MX')}</span>
          ) : (
            <span className="text-amber-600 font-medium">Pendiente de firma de Control Escolar</span>
          )}
          {estadoActa.borrador && (
            <span className="text-red-600 font-medium">— aún faltan calificaciones finales por capturar (el PDF se marca como BORRADOR)</span>
          )}
        </div>
      )}
      {cargaSeleccionadaId && estadoActa && !estadoActa.planeacion_liberada && (
        <p className="text-[11px] text-amber-600 px-1">
          La instrumentación didáctica de esta materia aún no está liberada — es necesario liberarla antes de poder generar el acta.
        </p>
      )}

      {mostrarHistorial && (
        <HistorialCalificacionesModal
          grupoId={grupoId}
          cargaAcademicaId={cargaSeleccionadaId}
          onClose={() => setMostrarHistorial(false)}
        />
      )}

      {detalleAlumnoId && (
        <DetalleAlumnoModal
          alumnoId={detalleAlumnoId}
          nombre={alumnoNombre(alumnos.find(a => a.id === detalleAlumnoId) ?? {})}
          promedioGrupo={promedioGrupoMateria}
          onClose={() => setDetalleAlumnoId(null)}
        />
      )}

      {mostrarImportar && cargaSeleccionadaId && (
        <ImportarCsvModal
          grupoId={grupoId}
          cargaAcademicaId={cargaSeleccionadaId}
          onClose={() => setMostrarImportar(false)}
          onImportado={() => qc.invalidateQueries({ queryKey: ['calificaciones-grupo', grupoId] })}
        />
      )}

      {!periodoActivo && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-sm text-amber-800">
          El periodo de este grupo no está activo — la captura de calificaciones está deshabilitada.
        </div>
      )}

      {confirmReabrir && (
        <div className="px-6 py-3 border-b bg-slate-50 border-slate-100 text-sm space-y-2">
          <p className="text-slate-700">¿Reabrir el curso? Las calificaciones volverán a ser editables. Solo es posible si ningún acta de este grupo ha sido firmada.</p>
          <textarea
            value={motivoReabrir}
            onChange={e => setMotivoReabrir(e.target.value)}
            rows={2}
            placeholder="Motivo de la reapertura (obligatorio, queda registrado en auditoría)…"
            className={`${inputCls} resize-none w-full`}
          />
          <div className="flex gap-2">
            <button
              onClick={() => reabrirMut.mutate()}
              disabled={reabrirMut.isPending || motivoReabrir.trim().length < 5}
              className="px-3 py-1 bg-slate-700 text-white text-xs rounded-lg disabled:opacity-50"
            >
              {reabrirMut.isPending ? 'Reabriendo…' : 'Confirmar reapertura'}
            </button>
            <button
              onClick={() => { setConfirmReabrir(false); setMotivoReabrir('') }}
              className="px-3 py-1 border border-slate-300 text-slate-600 text-xs rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {(confirmCierre || confirmFirma) && (
        <div className={`px-6 py-3 border-b text-sm flex items-center gap-3 ${confirmCierre ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
          <span className="text-slate-700">
            {confirmCierre
              ? '¿Cerrar el curso? Las calificaciones quedarán bloqueadas.'
              : '¿Firmar el acta? Esta acción no se puede deshacer.'}
          </span>
          <button
            onClick={() => confirmCierre ? cerrarMut.mutate() : firmarMut.mutate()}
            disabled={cerrarMut.isPending || firmarMut.isPending}
            className="px-3 py-1 bg-slate-700 text-white text-xs rounded-lg disabled:opacity-50"
          >
            Confirmar
          </button>
          <button
            onClick={() => { setConfirmCierre(false); setConfirmFirma(false) }}
            className="px-3 py-1 border border-slate-300 text-slate-600 text-xs rounded-lg"
          >
            Cancelar
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="px-6 py-8 text-center text-slate-400 text-sm">Cargando calificaciones…</div>
      ) : cargasDisponibles.length === 0 ? (
        <div className="px-6 py-8 text-center text-slate-400 text-sm">
          {esDocente ? 'No tienes una carga académica asignada en este grupo.' : 'Este grupo no tiene materias asignadas.'}
        </div>
      ) : !cargaSeleccionadaId ? (
        <div className="px-6 py-8 text-center text-slate-400 text-sm">Selecciona una materia para ver/capturar calificaciones.</div>
      ) : alumnos.length === 0 ? (
        <div className="px-6 py-8 text-center text-slate-400 text-sm">Sin alumnos asignados.</div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed" style={{ minWidth: 640 + numerosParciales.length * 112 }}>
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <Th className="w-12">No.</Th>
              <Th className="w-28">No. Control</Th>
              <Th className="w-56">Alumno</Th>
              {numerosParciales.map(n => (
                <Fragment key={n}>
                  <Th id={`col-parcial-${n}`} className={`w-28 ${n === columnaEditable ? 'bg-amber-100' : ''}`}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1 min-w-0">
                        <span className="truncate">
                          Tema {n}{pesoUnidad(n) != null ? ` (${pesoUnidad(n)}%)` : ''}
                        </span>
                        {corteVencido(n) && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" />}
                        {nombreUnidad(n) && (
                          <span
                            className="shrink-0 w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 text-[9px] font-bold flex items-center justify-center cursor-help"
                            title={[
                              `Unidad ${n} — ${nombreUnidad(n)}`,
                              pesoUnidad(n) != null ? `Vale ${pesoUnidad(n)}% de la calificación final` : null,
                              corteDe(n) ? `Corte: vence ${new Date(corteDe(n)!.fecha_limite_captura).toLocaleDateString('es-MX')}${corteVencido(n) ? ' (ya venció)' : ''}` : null,
                            ].filter(Boolean).join(' — ')}
                          >
                            i
                          </span>
                        )}
                      </span>
                      {esDocente && (
                        n === columnaEditable ? (
                          <button
                            type="button"
                            onClick={() => setColumnaEditable(null)}
                            className="shrink-0 normal-case font-normal text-[10px] text-brand-600 hover:underline"
                          >
                            Listo
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setColumnaEditable(n)}
                            title={`Habilitar edición de P${n}`}
                            className="shrink-0 normal-case font-normal text-[10px] text-brand-600 hover:underline"
                          >
                            Editar
                          </button>
                        )
                      )}
                    </div>
                  </Th>
                </Fragment>
              ))}
              {puedeEditarFinal && <Th className="w-24">Final</Th>}
              {puedeEditarFinal && <Th className="w-32">Estatus</Th>}
              {(puedeEditarFinal || puedeVerHistorial) && <Th className="w-24">Acciones</Th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {alumnos.map((a, i) => {
              const cal = calMap[a.id]
              const filaBloqueada = !!cal?.publicada || !periodoActivo
              const modificada = filaModificada(a.id)

              return (
                <tr key={a.id} className={`hover:bg-slate-50 transition-colors ${modificada ? 'bg-brand-50/40' : ''}`}>
                  <td className="px-2 py-2.5 text-center text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-2 py-2.5 text-xs text-slate-500 font-mono truncate">{a.numero_control}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800 truncate">{alumnoNombre(a)}</td>
                  {esDocente ? (
                    <>
                      {numerosParciales.map(n => {
                        const columnaAbierta = n === columnaEditable && !filaBloqueada
                        const valorGuardado = cal?.parciales?.find(p => p.parcial === n)?.calificacion
                        const valor = edits[a.id]?.[n] ?? ''
                        const valorEquivalencia = columnaAbierta ? valor : (valorGuardado != null ? String(valorGuardado) : '')
                        const equiv = pesoUnidad(n) != null ? equivalentePonderado(valorEquivalencia, n) : null
                        return (
                          <td key={n} className={`px-2 py-2 ${n === columnaEditable ? 'bg-amber-50' : ''}`}>
                            {columnaAbierta ? (
                              <div className="flex items-center gap-1">
                                <input type="number" min="0" max="100" step="0.1" value={valor}
                                  onChange={e => setEdits(f => ({ ...f, [a.id]: { ...f[a.id], [n]: clampCalificacion(e.target.value) } }))}
                                  className={inputCls + ' w-14'} placeholder="—" />
                                {equiv && <span className="text-[10px] text-slate-400 whitespace-nowrap">= {equiv}</span>}
                              </div>
                            ) : (
                              <span
                                className="text-slate-700 px-1"
                                title={filaBloqueada ? (cal?.publicada ? 'Calificación ya publicada' : 'Periodo inactivo') : 'Da clic en "Editar" (encabezado de la columna) para actualizarla'}
                              >
                                {valorGuardado ?? '—'}
                                {equiv && equiv !== '—' && <span className="text-[10px] text-slate-400"> ({equiv})</span>}
                              </span>
                            )}
                          </td>
                        )
                      })}
                      {puedeEditarFinal && (
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <input type="number" min="0" max="100" step="0.1" value={editsFinal[a.id] ?? ''}
                              onChange={e => setEditsFinal(f => ({ ...f, [a.id]: clampCalificacion(e.target.value) }))}
                              disabled={filaBloqueada}
                              className={`${inputCls} w-16 ${filaBloqueada ? 'opacity-40 cursor-not-allowed bg-slate-50' : ''}`} placeholder="—" />
                            <label className="flex items-center gap-1 text-[11px] text-slate-500 whitespace-nowrap" title="Marcar si esta calificación se obtuvo en segunda intención">
                              <input type="checkbox"
                                checked={(editsOportunidad[a.id] ?? 'primera_oportunidad') === 'segunda_oportunidad'}
                                onChange={e => setEditsOportunidad(f => ({ ...f, [a.id]: e.target.checked ? 'segunda_oportunidad' : 'primera_oportunidad' }))}
                                disabled={filaBloqueada}
                                className="w-3.5 h-3.5" />
                              2ª intención
                            </label>
                          </div>
                        </td>
                      )}
                      {puedeEditarFinal && (
                        <td className="px-4 py-2.5 text-center">
                          {cal?.calificacion_final != null && cal?.acreditado === true && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">APROBADO</span>
                          )}
                          {cal?.calificacion_final != null && cal?.acreditado === false && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">NO APROBADO</span>
                          )}
                          {cal?.calificacion_final == null && (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      )}
                      {(puedeEditarFinal || puedeVerHistorial) && (
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {cal?.publicada ? (
                              <span className="text-xs text-slate-400">Publicada</span>
                            ) : !periodoActivo ? (
                              <span className="text-xs text-slate-400">Periodo inactivo</span>
                            ) : modificada ? (
                              <span className="text-xs text-brand-600 font-medium">Sin guardar</span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                            {puedeVerHistorial && (
                              <button onClick={() => setDetalleAlumnoId(a.id)} className="text-xs text-brand-600 hover:underline">
                                Ver detalle
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </>
                  ) : (
                    <>
                      {numerosParciales.map(n => {
                        const calP = cal?.parciales?.find(p => p.parcial === n)?.calificacion
                        const equiv = pesoUnidad(n) != null ? equivalentePonderado(calP != null ? String(calP) : '', n) : null
                        return (
                          <td key={n} className={`px-4 py-2.5 text-center text-slate-700 ${n === unidadDestacada ? 'bg-amber-50' : ''}`}>
                            {calP ?? '—'}
                            {equiv && equiv !== '—' && <span className="text-[10px] text-slate-400"> ({equiv})</span>}
                          </td>
                        )
                      })}
                      {puedeEditarFinal && (
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <input type="number" min="0" max="100" step="0.1" value={editsFinal[a.id] ?? ''}
                              onChange={e => setEditsFinal(f => ({ ...f, [a.id]: clampCalificacion(e.target.value) }))}
                              disabled={filaBloqueada}
                              className={`${inputCls} w-16 ${filaBloqueada ? 'opacity-40 cursor-not-allowed bg-slate-50' : ''}`} placeholder="—" />
                            <label className="flex items-center gap-1 text-[11px] text-slate-500 whitespace-nowrap" title="Marcar si esta calificación se obtuvo en segunda intención">
                              <input type="checkbox"
                                checked={(editsOportunidad[a.id] ?? 'primera_oportunidad') === 'segunda_oportunidad'}
                                onChange={e => setEditsOportunidad(f => ({ ...f, [a.id]: e.target.checked ? 'segunda_oportunidad' : 'primera_oportunidad' }))}
                                disabled={filaBloqueada}
                                className="w-3.5 h-3.5" />
                              2ª intención
                            </label>
                          </div>
                        </td>
                      )}
                      {puedeEditarFinal && (
                        <td className="px-4 py-2.5 text-center">
                          {cal?.calificacion_final != null && cal?.acreditado === true && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">APROBADO</span>
                          )}
                          {cal?.calificacion_final != null && cal?.acreditado === false && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">NO APROBADO</span>
                          )}
                          {cal?.calificacion_final == null && (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      )}
                      {puedeVerHistorial && (
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {puedeEditarFinal && (
                              filaModificada(a.id)
                                ? <span className="text-xs text-brand-600 font-medium">Sin guardar</span>
                                : <span className="text-xs text-slate-300">—</span>
                            )}
                            <button onClick={() => setDetalleAlumnoId(a.id)} className="text-xs text-brand-600 hover:underline">
                              Ver detalle
                            </button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
