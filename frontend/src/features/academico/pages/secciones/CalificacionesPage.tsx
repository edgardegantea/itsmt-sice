import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi } from '../../services/academico'
import type { CargaAcademica, Calificacion } from '../../services/academico'
import { useToastStore } from '../../../../store/toastStore'
import { useAuthStore } from '../../../../store/authStore'
import { usePeriodoActivo } from '../../../../hooks/usePeriodoActivo'
import { Th, mutationError, inputCls, selectCls } from '../tabs/shared'
import apiClient from '../../../../config/apiClient'
import ViewToggle, { useViewMode } from '../../../../components/ui/ViewToggle'

function alumnoNombre(a: {
  user?: { name: string }
  inscripcion?: { aspirante?: { nombres: string; apellido_paterno: string; apellido_materno?: string } }
}): string {
  if (a.user?.name) return a.user.name
  if (a.inscripcion?.aspirante) {
    const asp = a.inscripcion.aspirante
    return `${asp.nombres} ${asp.apellido_paterno} ${asp.apellido_materno ?? ''}`.trim()
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
}: {
  esDocente: boolean
  currentUserId?: string
  periodoId?: string
  grupoId: string | null
  cargaId: string | null
  onChange: (seleccion: { grupoId: string; cargaId: string | null } | null) => void
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

  if (esDocente) {
    // Cada opción es una combinación única materia+grupo ya liberada en la
    // instrumentación didáctica del docente — no hace falta un segundo select
    // para elegir la materia porque ya quedó fijada aquí.
    const opciones = cargasDocente
      .filter(c => c.instrumentacion_liberada)
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
          onChange(o ? { grupoId: o.grupoId, cargaId: o.cargaId } : null)
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
    const porCarrera = new Map<string, { carrera: string; semestres: Map<number, typeof grupos> }>()
    for (const g of grupos) {
      const carrera = g.carrera?.nombre ?? 'Sin carrera'
      if (!porCarrera.has(carrera)) porCarrera.set(carrera, { carrera, semestres: new Map() })
      const bucket = porCarrera.get(carrera)!
      if (!bucket.semestres.has(g.semestre)) bucket.semestres.set(g.semestre, [])
      bucket.semestres.get(g.semestre)!.push(g)
    }
    return [...porCarrera.values()]
      .sort((a, b) => a.carrera.localeCompare(b.carrera))
      .map(c => ({
        carrera: c.carrera,
        semestres: [...c.semestres.entries()]
          .sort(([a], [b]) => a - b)
          .map(([semestre, gs]) => ({
            semestre,
            grupos: gs.slice().sort((a, b) => a.clave.localeCompare(b.clave)),
          })),
      }))
  }, [grupos])

  const [vista, setVista] = useViewMode('calificaciones-grupos', 'cards')

  // Filas planas (una por grupo) para la vista de tabla — mismo orden carrera → semestre → grupo.
  const filas = useMemo(
    () => estructura.flatMap(({ carrera, semestres }) =>
      semestres.flatMap(({ semestre, grupos: gs }) => gs.map(g => ({ carrera, semestre, grupo: g })))
    ),
    [estructura]
  )

  if (esDocente) return null // rama de docente manejada arriba

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={grupoId ?? ''}
          onChange={e => onChange(e.target.value ? { grupoId: e.target.value, cargaId: null } : null)}
          className={`${inputCls} max-w-md`}
          disabled={cargandoGrupos}
        >
          <option value="">{cargandoGrupos ? 'Cargando…' : 'Selecciona un grupo…'}</option>
          {estructura.map(({ carrera, semestres }) => (
            <optgroup key={carrera} label={carrera}>
              {semestres.flatMap(({ semestre, grupos: gs }) => gs.map(g => (
                <option key={g.id} value={g.id}>
                  {semestre}° — Grupo {g.clave}
                </option>
              )))}
            </optgroup>
          ))}
        </select>
        <ViewToggle value={vista} onChange={setVista} />
      </div>

      {/* Todos los grupos listados por carrera → semestre → grupo, con la asignatura(s)
          de cada grupo visible directamente — un clic en la asignatura abre la captura
          de calificaciones ya con esa materia elegida. */}
      {cargandoGrupos ? (
        <p className="text-sm text-slate-400">Cargando grupos…</p>
      ) : estructura.length === 0 ? (
        <p className="text-sm text-slate-400">No hay grupos registrados en este periodo.</p>
      ) : vista === 'lista' ? (
        <div className="border border-slate-200 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Carrera</Th>
                <Th>Semestre</Th>
                <Th>Grupo</Th>
                <Th>Alumnos</Th>
                <Th>Materias</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map(({ carrera, semestre, grupo: g }) => {
                const materias = g.cargas ?? []
                const activo = grupoId === g.id
                return (
                  <tr key={g.id} className={activo ? 'bg-blue-50/50' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-2.5 text-slate-600">{carrera}</td>
                    <td className="px-4 py-2.5 text-slate-600">{semestre}°</td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => onChange({ grupoId: g.id, cargaId: null })}
                        className="font-medium text-slate-800 hover:text-[#1a3a5c] hover:underline"
                      >
                        {g.clave}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{g.alumnos_count ?? 0}</td>
                    <td className="px-4 py-2.5">
                      {materias.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">Sin materias asignadas</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {materias.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => onChange({ grupoId: g.id, cargaId: c.id })}
                              className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                                activo && cargaId === c.id
                                  ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {c.materia?.nombre ?? 'Materia'}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-5">
          {estructura.map(({ carrera, semestres }) => (
            <div key={carrera}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{carrera}</p>
              <div className="space-y-3">
                {semestres.map(({ semestre, grupos: gs }) => (
                  <div key={semestre}>
                    <p className="text-xs font-medium text-slate-400 mb-1.5">{semestre}° semestre</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {gs.map(g => {
                        const materias = g.cargas ?? []
                        const activo = grupoId === g.id
                        return (
                          <div
                            key={g.id}
                            className={`rounded-lg border p-2.5 ${activo ? 'border-[#1a3a5c] ring-1 ring-[#1a3a5c]/30' : 'border-slate-200'}`}
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
                                    onClick={() => onChange({ grupoId: g.id, cargaId: c.id })}
                                    className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                                      activo && cargaId === c.id
                                        ? 'bg-[#1a3a5c] text-white border-[#1a3a5c]'
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
  // El grupo/materia/periodo elegidos viven en la URL (no solo en estado local) para que
  // dar clic en un grupo "abra" esa selección como una página propia — enlazable,
  // recargable y navegable con atrás/adelante — en vez de perderse al refrescar.
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
  const puedeAdministrar = !!user?.roles.some(r => ['superadmin', 'admin', 'jefe_carrera', 'director_academico', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'].includes(r))
  const puedeFirmar = !!user?.roles.some(r => ['superadmin', 'admin'].includes(r))

  const { data: grupo, isLoading: cargandoGrupo } = useQuery({
    queryKey: ['grupo-detalle-calificaciones', grupoId],
    queryFn: () => academicoApi.getGrupo(grupoId!),
    enabled: !!grupoId,
  })

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Captura de Calificaciones</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {esDocente
              ? 'Selecciona una de tus materias asignadas para capturar las calificaciones de tus alumnos.'
              : 'Selecciona un periodo y un grupo para revisar o capturar las calificaciones de sus materias.'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 max-w-xs">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Periodo *</label>
          <select
            value={periodoId}
            onChange={e => {
              const v = e.target.value
              setSearchParams(v ? { periodo_id: v } : {})
            }}
            className={selectCls}
          >
            <option value="">— Selecciona —</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (activo)' : ''}</option>)}
          </select>
        </div>

        {periodoId && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            {esDocente ? 'Materia — Grupo' : 'Grupo'}
          </label>
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
          />
        </div>
        )}

        {!periodoId ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">Selecciona un periodo académico para comenzar.</p>
          </div>
        ) : !grupoId ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">Elige una opción arriba para ver la lista de alumnos.</p>
          </div>
        ) : cargandoGrupo || !grupo ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">Cargando…</p>
          </div>
        ) : (
          <CalificacionesSection
            grupoId={grupo.id}
            alumnos={grupo.alumnos ?? []}
            cargas={grupo.cargas ?? []}
            currentUserId={user?.id}
            periodoId={grupo.periodo_id}
            periodoActivo={grupo.periodo?.activo ?? true}
            esDocente={esDocente}
            puedeFirmar={puedeFirmar || (puedeAdministrar && !esDocente)}
            cargaPreseleccionadaId={cargaId}
          />
        )}
      </div>
    </div>
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
}) {
  const qc = useQueryClient()
  const { toast: addToast } = useToastStore()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [confirmCierre, setConfirmCierre] = useState(false)
  const [confirmFirma, setConfirmFirma] = useState(false)
  const [confirmReabrir, setConfirmReabrir] = useState(false)
  const [motivoReabrir, setMotivoReabrir] = useState('')

  // Formulario inline
  const [parcialesForm, setParcialesForm] = useState<Record<number, string>>({})
  const [calFinal, setCalFinal] = useState('')

  // Un grupo puede agrupar varias materias (cargas académicas); un docente solo
  // captura las suyas, un administrador puede elegir cuál materia calificar.
  const cargasDisponibles = useMemo(
    () => (esDocente ? cargas.filter(c => c.docente_id === currentUserId) : cargas),
    [cargas, esDocente, currentUserId]
  )

  const [cargaSeleccionadaId, setCargaSeleccionadaId] = useState<string | null>(null)
  const cargaSeleccionada = cargasDisponibles.find(c => c.id === cargaSeleccionadaId)

  // Las unidades a capturar (cantidad, nombre y % de la calificación final) deben
  // coincidir con la instrumentación didáctica (planeación) que el docente entregó
  // para esta materia y periodo — no un valor fijo ni el temario genérico.
  const { data: planeacionesData } = useQuery({
    queryKey: ['planeacion-para-calificaciones', cargaSeleccionadaId, periodoId],
    queryFn: () => academicoApi.getPlaneaciones({ carga_academica_id: cargaSeleccionadaId!, periodo_id: periodoId }),
    enabled: !!cargaSeleccionadaId && !!periodoId,
  })
  const planeacion = (planeacionesData?.data ?? [])[0] as { competencias?: { numero: number; nombre_unidad: string; porcentaje: number | null }[] } | undefined
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

  const { data: calificaciones = [], isLoading } = useQuery({
    queryKey: ['calificaciones-grupo', grupoId],
    queryFn: () => academicoApi.getCalificacionesGrupo(grupoId),
  })

  const calMap = useMemo(() => {
    const m: Record<string, Calificacion> = {}
    calificaciones
      .filter(c => c.carga_academica_id === cargaSeleccionadaId)
      .forEach(c => { m[c.alumno_id] = c })
    return m
  }, [calificaciones, cargaSeleccionadaId])

  const registrarMut = useMutation({
    mutationFn: (data: Parameters<typeof academicoApi.registrarCalificacion>[0]) =>
      academicoApi.registrarCalificacion(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calificaciones-grupo', grupoId] })
      setEditandoId(null)
      addToast('Calificación guardada.', 'success')
    },
    onError: (e) => addToast(mutationError(e), 'error'),
  })

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

  function abrirEdicion(alumnoId: string) {
    const cal = calMap[alumnoId]
    const nuevo: Record<number, string> = {}
    numerosParciales.forEach(n => {
      nuevo[n] = String(cal?.parciales?.find(p => p.parcial === n)?.calificacion ?? '')
    })
    setParcialesForm(nuevo)
    setCalFinal(cal?.calificacion_final != null ? String(cal.calificacion_final) : '')
    setEditandoId(alumnoId)
  }

  function guardar(alumnoId: string) {
    if (!cargaSeleccionadaId) return

    const parciales = numerosParciales
      .map(n => ({ parcial: n, calificacion: Number(parcialesForm[n]) }))
      .filter(p => !isNaN(p.calificacion) && String(parcialesForm[p.parcial] ?? '') !== '')

    const calificacionFinalNum = Number(calFinal)
    const calificacion_final = !isNaN(calificacionFinalNum) && calFinal !== '' ? calificacionFinalNum : undefined

    registrarMut.mutate({ alumno_id: alumnoId, grupo_id: grupoId, carga_academica_id: cargaSeleccionadaId, parciales, calificacion_final })
  }

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
        <div className="flex gap-2">
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
      </div>

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
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <Th>Alumno</Th>
              {numerosParciales.map(n => (
                <Th key={n}>
                  <span title={nombreUnidad(n) ? `Unidad ${n} — ${nombreUnidad(n)}` : `Parcial ${n}`}>
                    P{n}{nombreUnidad(n) ? ` · ${nombreUnidad(n)}` : ''}
                  </span>
                </Th>
              ))}
              <Th>Final</Th>
              <Th>Promedio</Th>
              <Th>Estatus</Th>
              {esDocente && <Th></Th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {alumnos.map(a => {
              const cal = calMap[a.id]
              const getP = (n: number) => cal?.parciales?.find(p => p.parcial === n)?.calificacion
              const editando = editandoId === a.id

              return (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-800">{alumnoNombre(a)}</div>
                    <div className="text-xs text-slate-400 font-mono">{a.numero_control}</div>
                  </td>
                  {editando ? (
                    <>
                      {numerosParciales.map(n => (
                        <td key={n} className="px-2 py-2">
                          <input type="number" min="0" max="100" step="0.1" value={parcialesForm[n] ?? ''}
                            onChange={e => setParcialesForm(f => ({ ...f, [n]: e.target.value }))}
                            className={`${inputCls} w-16`} placeholder="—" />
                        </td>
                      ))}
                      <td className="px-2 py-2">
                        <input type="number" min="0" max="100" step="0.1" value={calFinal}
                          onChange={e => setCalFinal(e.target.value)}
                          className={`${inputCls} w-16`} placeholder="—" />
                      </td>
                      <td className="px-2 py-2 text-slate-400 text-xs">—</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => guardar(a.id)}
                            disabled={registrarMut.isPending}
                            className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded-lg disabled:opacity-50"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditandoId(null)}
                            className="px-2 py-1 border border-slate-300 text-slate-600 text-xs rounded-lg"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      {numerosParciales.map(n => (
                        <td key={n} className="px-4 py-2.5 text-center text-slate-700">{getP(n) ?? '—'}</td>
                      ))}
                      <td className="px-4 py-2.5 text-center text-slate-700">{cal?.calificacion_final ?? '—'}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-slate-800">
                        {cal?.promedio ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {cal?.acreditado === true && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Acreditado</span>
                        )}
                        {cal?.acreditado === false && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">No acreditado</span>
                        )}
                        {cal?.acreditado === null || cal?.acreditado === undefined ? (
                          <span className="text-slate-400 text-xs">Sin calificación</span>
                        ) : null}
                      </td>
                      {esDocente && (
                        <td className="px-4 py-2.5 text-right">
                          {cal?.publicada ? (
                            <span className="text-xs text-slate-400">Publicada</span>
                          ) : !periodoActivo ? (
                            <span className="text-xs text-slate-400">Periodo inactivo</span>
                          ) : (
                            <button
                              onClick={() => abrirEdicion(a.id)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {cal ? 'Editar' : 'Capturar'}
                            </button>
                          )}
                        </td>
                      )}
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
