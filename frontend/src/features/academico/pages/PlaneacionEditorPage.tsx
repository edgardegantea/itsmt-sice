import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authStore'
import { useToastStore } from '../../../store/toastStore'
import {
  academicoApi,
  type PlaneacionDocente, type CargaAcademica,
  type CompetenciaEspecifica, type SemanaCalendarizacion,
  type FuenteInformacion, type TipoFuente, type ObservacionCampo, type SeccionObservacion,
} from '../services/academico'
import { mutationError, ModalWrap } from './tabs/shared'
import apiClient from '../../../config/apiClient'
import {
  COMPETENCIAS_INSTRUMENTALES, COMPETENCIAS_INTERPERSONALES, COMPETENCIAS_SISTEMICAS,
  APOYOS_DIDACTICOS_CATALOGO,
  NIVEL_RANGO, semanasVacias, nuevaCompetencia, normalizarCompetencia,
  citarFuente, TIPO_FUENTE_LABEL,
} from './planeacionCatalogo'
import {
  ESTATUS_COLOR, ESTATUS_LABEL, PASOS, type Paso, Field,
  inputCls, smallInputCls,
  CATEGORIAS, type CategoriaId,
} from './planeacionShared'

const TIPOS_FUENTE: { value: TipoFuente; label: string }[] = [
  { value: 'impreso',   label: TIPO_FUENTE_LABEL.impreso },
  { value: 'articulo',  label: TIPO_FUENTE_LABEL.articulo },
  { value: 'sitio_web', label: TIPO_FUENTE_LABEL.sitio_web },
  { value: 'digital',   label: TIPO_FUENTE_LABEL.digital },
]

const FUENTE_VACIA: FuenteInformacion = { tipo: '', titulo: '' }

function categoriaCompleta(comp: CompetenciaEspecifica, cat: CategoriaId): boolean {
  switch (cat) {
    case 'analisis':    return !!comp.descripcion.trim()
    case 'indicadores': return comp.indicadores_alcance.length > 0 && comp.matriz_evaluacion.length >= MIN_EVIDENCIAS_POR_UNIDAD
    case 'fuentes':      return comp.fuentes_informacion.length > 0
    case 'apoyo':        return comp.apoyos_didacticos.length > 0
    case 'practicas':    return comp.practicas.length > 0
  }
}

// TecNM-AC-PO-003 §4 — reglas de ponderación del "Análisis por competencias específicas":
// ninguna unidad puede aportar más del 40% de la calificación final, cada unidad necesita
// al menos 3 evidencias de aprendizaje, ninguna evidencia puede superar el 40% del
// porcentaje de su unidad, y la suma de evidencias de una unidad debe igualar ese porcentaje.
const LIMITE_PORCENTAJE_UNIDAD = 40
const MIN_EVIDENCIAS_POR_UNIDAD = 3

function limiteEvidencia(porcentajeUnidad: number | null): number {
  return Math.round((porcentajeUnidad ?? 0) * 0.4 * 100) / 100
}

function FolderIcon({ completo, conObservacion }: { completo: boolean; conObservacion?: boolean }) {
  return (
    <span className="relative inline-flex items-center justify-center w-11 h-11 rounded-full bg-blue-50 group-hover:bg-blue-100 transition-colors">
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      </svg>
      {conObservacion ? (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] ring-2 ring-white flex items-center justify-center">!</span>
      ) : completo && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 text-white text-[9px] ring-2 ring-white flex items-center justify-center">✓</span>
      )}
    </span>
  )
}

/** Observación(es) de Desarrollo Académico/Jefatura de Carrera ancladas exactamente a la
 * sección donde el docente está parado — se muestran arriba del contenido correspondiente
 * para que sepa qué corregir sin tener que buscarlo en un comentario general. */
function NotaRevisor({ items }: { items: ObservacionCampo[] }) {
  if (!items.length) return null
  return (
    <div className="space-y-1.5 mb-3">
      {items.map(o => (
        <div key={o.id} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="shrink-0 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">!</span>
          <p className="text-xs text-amber-800 whitespace-pre-line">{o.texto}</p>
        </div>
      ))}
    </div>
  )
}

interface FormPlaneacion {
  caracterizacion: string
  intencion_didactica: string
  competencia_asignatura: string
  competencias: CompetenciaEspecifica[]
  calendarizacion: SemanaCalendarizacion[]
}

function formVacio(): FormPlaneacion {
  return {
    caracterizacion: '', intencion_didactica: '', competencia_asignatura: '',
    competencias: [],
    calendarizacion: semanasVacias(),
  }
}

/** Indica si un paso ya tiene contenido capturado, para mostrar su avance en la navegación. */
function pasoCompleto(paso: Paso, f: FormPlaneacion): boolean {
  switch (paso) {
    case 'generales':       return !!f.caracterizacion.trim() && !!f.intencion_didactica.trim() && !!f.competencia_asignatura.trim()
    case 'especificas':     return f.competencias.length > 0
    case 'dosificacion':    return f.competencias.some(c => c.dosificacion.length > 0)
    case 'calendarizacion': return f.calendarizacion.some(s => s.tipo_evaluacion !== '')
  }
}

type EstadoDosificacion = 'pendiente' | 'a_tiempo' | 'adelantado' | 'atraso'

function estadoSubtema(s: { semana_inicio: number | null; semana_fin: number | null; semana_realizado: number | null }): EstadoDosificacion {
  if (s.semana_realizado == null) return 'pendiente'
  if (s.semana_inicio != null && s.semana_realizado < s.semana_inicio) return 'adelantado'
  if (s.semana_fin != null && s.semana_realizado > s.semana_fin) return 'atraso'
  return 'a_tiempo'
}

const ESTADO_DOSIFICACION_LABEL: Record<EstadoDosificacion, string> = {
  pendiente:  'Pendiente',
  a_tiempo:   'A tiempo',
  adelantado: 'Adelantado',
  atraso:     'Atraso',
}

const ESTADO_DOSIFICACION_COLOR: Record<EstadoDosificacion, string> = {
  pendiente:  'bg-slate-100 text-slate-500',
  a_tiempo:   'bg-green-100 text-green-700',
  adelantado: 'bg-blue-100 text-blue-700',
  atraso:     'bg-red-100 text-red-700',
}

export default function PlaneacionEditorPage() {
  const { cargaId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const periodoId = searchParams.get('periodo') ?? ''
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const toast = useToastStore()
  const [form, setForm] = useState<FormPlaneacion | null>(null)
  const [cargado, setCargado] = useState(false)
  const [infoAbierta, setInfoAbierta] = useState(true)
  const [paso, setPaso] = useState<Paso>('generales')
  const [vistaCompetencia, setVistaCompetencia] = useState<{ idx: number; cat: CategoriaId } | null>(null)
  const [nuevoApoyo, setNuevoApoyo] = useState<Record<number, string>>({})
  const [modalFuente, setModalFuente] = useState<{ idx: number; fIdx: number | null } | null>(null)
  const [draftFuente, setDraftFuente] = useState<FuenteInformacion>(FUENTE_VACIA)

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos-select'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; activo: boolean }[]),
    staleTime: 60_000,
  })

  const { data: misCargas = [], isSuccess: cargasListas } = useQuery({
    queryKey: ['mis-cargas', periodoId, user?.id],
    queryFn: () => academicoApi.getCargas({ docente_id: user!.id, periodo_id: periodoId }),
    enabled: !!periodoId && !!user?.id,
  })

  const { data: misPlaneaciones = [], isSuccess: planeacionesListas } = useQuery({
    queryKey: ['mis-planeaciones', periodoId],
    queryFn: () => academicoApi.getMisPlaneaciones(periodoId ? { periodo_id: periodoId } : undefined),
    enabled: !!user?.id,
  })

  // Aulas registradas en el sistema, para precargar el campo "Lugar" de las prácticas.
  const { data: aulas = [] } = useQuery({
    queryKey: ['aulas-select'],
    queryFn: () => academicoApi.getAulas(),
    staleTime: 60_000,
  })

  const cargaActual = (misCargas as CargaAcademica[]).find(c => c.id === cargaId)
  const periodoActual = periodos.find(p => p.id === periodoId)
  const planeacionActual = (misPlaneaciones as PlaneacionDocente[]).find(p => p.carga_academica_id === cargaId)
  const soloLectura = !!planeacionActual && ['enviada_da', 'enviada_jc', 'liberada'].includes(planeacionActual.estatus)

  const observacionesCampos = planeacionActual?.observaciones_campos ?? []
  const obsPara = (seccion: SeccionObservacion, opts?: { unidad?: number; categoria?: string }) =>
    observacionesCampos.filter(o =>
      o.seccion === seccion &&
      (opts?.unidad === undefined || o.unidad === opts.unidad) &&
      (opts?.categoria === undefined || o.categoria === opts.categoria)
    )
  const SECCIONES_POR_PASO: Record<Paso, SeccionObservacion[]> = {
    generales: ['caracterizacion', 'intencion_didactica', 'competencia_asignatura'],
    especificas: ['especifica'],
    dosificacion: ['dosificacion'],
    calendarizacion: ['calendarizacion'],
  }
  const pasoTieneObservacion = (p: Paso) => observacionesCampos.some(o => SECCIONES_POR_PASO[p].includes(o.seccion))

  const formDesdePlaneacion = (p: PlaneacionDocente): FormPlaneacion => ({
    caracterizacion:         p.caracterizacion ?? '',
    intencion_didactica:     p.intencion_didactica ?? '',
    competencia_asignatura: p.competencia_asignatura ?? '',
    competencias:            (p.competencias ?? []).map((c, i) => normalizarCompetencia({ ...c, numero: c.numero ?? i + 1 })),
    calendarizacion:         p.calendarizacion?.length === 16 ? p.calendarizacion : semanasVacias(),
  })

  // Para una instrumentación nueva (sin planeación previa), precarga lo que ya está
  // estandarizado a nivel de la asignatura (módulo de Materias) — caracterización,
  // intención didáctica, competencia, temario/actividades de aprendizaje por tema y
  // fuentes de información (en la primera unidad) — para que el docente solo tenga que
  // ajustarlo y enfocarse en actividades de enseñanza, indicadores/evaluación y calendarización.
  const formDesdeMateria = (materia?: CargaAcademica['materia']): FormPlaneacion => {
    if (!materia) return formVacio()
    const temario = materia.temario ?? []
    const actividadesPorTema = new Map((materia.actividades_aprendizaje ?? []).map(a => [a.tema, a]))
    const fuentesMateria = (materia.fuentes_informacion ?? []).map(f => ({ tipo: '' as const, titulo: f }))
    const competencias: CompetenciaEspecifica[] = temario.map((t, i) => {
      const actividad = actividadesPorTema.get(t.tema)
      return {
        ...nuevaCompetencia(i + 1),
        nombre_unidad: t.tema,
        descripcion: actividad?.competencias ?? '',
        subtemas: [t.tema, ...(t.subtemas ?? [])].map(texto => ({ texto, fila: 1 })),
        actividades: [{
          numero: 1,
          actividad_ensenanza: '',
          actividad_aprendizaje: actividad?.actividades?.join('\n') ?? '',
          horas_teoricas: null,
          horas_practicas: null,
        }],
        fuentes_informacion: i === 0 ? fuentesMateria : [],
      }
    })
    return {
      caracterizacion:        materia.caracterizacion ?? '',
      intencion_didactica:    materia.intencion_didactica ?? '',
      competencia_asignatura: materia.competencia_especifica ?? '',
      competencias,
      calendarizacion:        semanasVacias(),
    }
  }

  const set = <K extends keyof FormPlaneacion>(k: K, v: FormPlaneacion[K]) => setForm(f => f ? { ...f, [k]: v } : f)

  // ── Competencias específicas (bloque repetible §4, una por unidad) ──────────
  const agregarCompetencia = () => setForm(f => f ? {
    ...f, competencias: [...f.competencias, nuevaCompetencia(f.competencias.length + 1)],
  } : f)

  const quitarCompetencia = (idx: number) => setForm(f => f ? {
    ...f, competencias: f.competencias.filter((_, i) => i !== idx).map((c, i) => ({ ...c, numero: i + 1 })),
  } : f)

  const setCompetencia = (idx: number, patch: Partial<CompetenciaEspecifica>) => setForm(f => f ? {
    ...f, competencias: f.competencias.map((c, i) => i === idx ? { ...c, ...patch } : c),
  } : f)

  // Actividades de enseñanza/aprendizaje (filas numeradas §4 "Análisis por competencias")
  const agregarActividad = (idx: number) => setCompetencia(idx, {
    actividades: [...form!.competencias[idx].actividades, {
      numero: form!.competencias[idx].actividades.length + 1,
      actividad_ensenanza: '', actividad_aprendizaje: '', horas_teoricas: null, horas_practicas: null,
    }],
  })
  const quitarActividad = (idx: number, aIdx: number) => setCompetencia(idx, {
    actividades: form!.competencias[idx].actividades.filter((_, i) => i !== aIdx).map((a, i) => ({ ...a, numero: i + 1 })),
  })
  const setActividad = (idx: number, aIdx: number, patch: Partial<{ actividad_ensenanza: string; actividad_aprendizaje: string; horas_teoricas: number | null; horas_practicas: number | null }>) =>
    setCompetencia(idx, {
      actividades: form!.competencias[idx].actividades.map((a, i) => i === aIdx ? { ...a, ...patch } : a),
    })

  // Subtemas del temario, cada uno asociado a una fila de actividades por número
  const agregarSubtemaTema = (idx: number) => setCompetencia(idx, {
    subtemas: [...form!.competencias[idx].subtemas, { texto: '', fila: null }],
  })
  const quitarSubtemaTema = (idx: number, sIdx: number) => setCompetencia(idx, {
    subtemas: form!.competencias[idx].subtemas.filter((_, i) => i !== sIdx),
  })
  const setSubtemaTema = (idx: number, sIdx: number, patch: Partial<{ texto: string; fila: number | null }>) =>
    setCompetencia(idx, {
      subtemas: form!.competencias[idx].subtemas.map((s, i) => i === sIdx ? { ...s, ...patch } : s),
    })

  const toggleCompetenciaGenerica = (idx: number, nombre: string) => setForm(f => {
    if (!f) return f
    const comp = f.competencias[idx]
    const activo = comp.competencias_genericas.includes(nombre)
    const nuevas = activo ? comp.competencias_genericas.filter(n => n !== nombre) : [...comp.competencias_genericas, nombre]
    return { ...f, competencias: f.competencias.map((c, i) => i === idx ? { ...c, competencias_genericas: nuevas } : c) }
  })

  // Indicadores de alcance
  const agregarIndicador = (idx: number) => setCompetencia(idx, {
    indicadores_alcance: [...form!.competencias[idx].indicadores_alcance, { letra: '', indicador: '', valor: null }],
  })
  const quitarIndicador = (idx: number, indIdx: number) => setCompetencia(idx, {
    indicadores_alcance: form!.competencias[idx].indicadores_alcance.filter((_, i) => i !== indIdx),
  })
  const setIndicador = (idx: number, indIdx: number, patch: Partial<{ letra: string; indicador: string; valor: number | null }>) =>
    setCompetencia(idx, {
      indicadores_alcance: form!.competencias[idx].indicadores_alcance.map((ind, i) => i === indIdx ? { ...ind, ...patch } : ind),
    })

  // Niveles de desempeño (rango numérico fijo institucional, solo se edita la descripción de indicadores)
  const setNivelDesempeno = (idx: number, nivelIdx: number, indicadores: string) =>
    setCompetencia(idx, {
      niveles_desempeno: form!.competencias[idx].niveles_desempeno.map((n, i) => i === nivelIdx ? { ...n, indicadores } : n),
    })

  // Matriz de evaluación (evidencias + checklist de qué indicadores de alcance cubre cada una)
  const agregarFilaMatriz = (idx: number) => setCompetencia(idx, {
    matriz_evaluacion: [...form!.competencias[idx].matriz_evaluacion, { evidencia: '', porcentaje: null, indicadores: [], evaluacion_formativa: '' }],
  })
  const quitarFilaMatriz = (idx: number, filaIdx: number) => setCompetencia(idx, {
    matriz_evaluacion: form!.competencias[idx].matriz_evaluacion.filter((_, i) => i !== filaIdx),
  })
  const setFilaMatriz = (idx: number, filaIdx: number, patch: Partial<{ evidencia: string; porcentaje: number | null; evaluacion_formativa: string }>) =>
    setCompetencia(idx, {
      matriz_evaluacion: form!.competencias[idx].matriz_evaluacion.map((fila, i) => i === filaIdx ? { ...fila, ...patch } : fila),
    })
  const toggleIndicadorEnFila = (idx: number, filaIdx: number, letra: string) => {
    const fila = form!.competencias[idx].matriz_evaluacion[filaIdx]
    const activo = fila.indicadores.includes(letra)
    setFilaMatrizIndicadores(idx, filaIdx, activo ? fila.indicadores.filter(l => l !== letra) : [...fila.indicadores, letra])
  }
  const setFilaMatrizIndicadores = (idx: number, filaIdx: number, indicadores: string[]) =>
    setCompetencia(idx, {
      matriz_evaluacion: form!.competencias[idx].matriz_evaluacion.map((fila, i) => i === filaIdx ? { ...fila, indicadores } : fila),
    })

  // Fuentes de información por unidad — se capturan vía modal (el formulario cambia de
  // campos según el tipo elegido) en vez de una fila de texto libre.
  const quitarFuente = (idx: number, fIdx: number) => setCompetencia(idx, {
    fuentes_informacion: form!.competencias[idx].fuentes_informacion.filter((_, i) => i !== fIdx),
  })
  const abrirModalFuente = (idx: number, fIdx: number | null) => {
    setDraftFuente(fIdx != null ? form!.competencias[idx].fuentes_informacion[fIdx] : FUENTE_VACIA)
    setModalFuente({ idx, fIdx })
  }
  const guardarFuenteModal = () => {
    if (!modalFuente || !draftFuente.titulo.trim() || !draftFuente.tipo) return
    const { idx, fIdx } = modalFuente
    const actuales = form!.competencias[idx].fuentes_informacion
    setCompetencia(idx, {
      fuentes_informacion: fIdx != null
        ? actuales.map((f, i) => i === fIdx ? draftFuente : f)
        : [...actuales, draftFuente],
    })
    setModalFuente(null)
  }

  // Apoyos didácticos por unidad — catálogo de selección múltiple + alta de nuevos, en vez
  // de texto libre repetible, para que el docente reutilice los mismos nombres entre unidades.
  const toggleApoyo = (idx: number, nombre: string) => {
    const actuales = form!.competencias[idx].apoyos_didacticos
    setCompetencia(idx, {
      apoyos_didacticos: actuales.includes(nombre) ? actuales.filter(a => a !== nombre) : [...actuales, nombre],
    })
  }
  const agregarApoyoPersonalizado = (idx: number, nombre: string) => {
    const limpio = nombre.trim()
    if (!limpio || form!.competencias[idx].apoyos_didacticos.includes(limpio)) return
    setCompetencia(idx, { apoyos_didacticos: [...form!.competencias[idx].apoyos_didacticos, limpio] })
  }

  // Prácticas por unidad
  const agregarPractica = (idx: number) => setCompetencia(idx, {
    practicas: [...form!.competencias[idx].practicas, { nombre: '', requisitos: '', semana: '', lugar: '' }],
  })
  const quitarPractica = (idx: number, pIdx: number) => setCompetencia(idx, {
    practicas: form!.competencias[idx].practicas.filter((_, i) => i !== pIdx),
  })
  const setPractica = (idx: number, pIdx: number, patch: Partial<{ nombre: string; requisitos: string; semana: string; lugar: string }>) =>
    setCompetencia(idx, {
      practicas: form!.competencias[idx].practicas.map((p, i) => i === pIdx ? { ...p, ...patch } : p),
    })

  // Dosificación semanal por subtema (avance real vs. planeado)
  const agregarSubtema = (idx: number) => setCompetencia(idx, {
    dosificacion: [...form!.competencias[idx].dosificacion, { subtema: '', semana_inicio: null, semana_fin: null, semana_realizado: null }],
  })
  const quitarSubtema = (idx: number, sIdx: number) => setCompetencia(idx, {
    dosificacion: form!.competencias[idx].dosificacion.filter((_, i) => i !== sIdx),
  })
  const setSubtema = (idx: number, sIdx: number, patch: Partial<{ subtema: string; semana_inicio: number | null; semana_fin: number | null; semana_realizado: number | null }>) =>
    setCompetencia(idx, {
      dosificacion: form!.competencias[idx].dosificacion.map((s, i) => i === sIdx ? { ...s, ...patch } : s),
    })

  // ── Calendarización de evaluación (§6, 16 semanas fijas) ────────────────────
  const setSemana = (semIdx: number, patch: Partial<SemanaCalendarizacion>) => setForm(f => f ? {
    ...f, calendarizacion: f.calendarizacion.map((s, i) => i === semIdx ? { ...s, ...patch } : s),
  } : f)

  const mutSave = useMutation({
    mutationFn: () => academicoApi.savePlaneacion({
      ...form,
      carga_academica_id: cargaId,
      periodo_id: periodoId,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-planeaciones'] })
    },
    onError: (e) => toast.error(mutationError(e)),
  })

  // Autoguardado: cada cambio en el formulario se guarda solo, sin que el docente tenga
  // que presionar un botón — con un pequeño debounce para no disparar una petición por tecla.
  // La bandera evita que el primer valor sembrado (formDesdePlaneacion/formDesdeMateria) se
  // vuelva a guardar de inmediato como si fuera una edición del docente.
  const primerFormRef = useRef(true)
  useEffect(() => {
    if (!cargado || !form || soloLectura) return
    if (primerFormRef.current) { primerFormRef.current = false; return }
    const t = setTimeout(() => mutSave.mutate(), 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, cargado])

  // Siembra el formulario la primera vez que AMBAS consultas (cargas y planeaciones) ya
  // resolvieron — desde la planeación guardada si existe, o desde la materia estandarizada
  // si es una instrumentación nueva. Debe esperar a las dos: si solo se espera a "cargas",
  // una respuesta más lenta de "planeaciones" haría sembrar el formulario vacío y esa carrera
  // (race condition) quedaría fija con "cargado=true", perdiendo silenciosamente el contenido
  // ya guardado hasta que el docente guardara y sobrescribiera su propia planeación con vacío.
  // Se deriva directo del render (sin useEffect) siguiendo el patrón ya usado en este módulo.
  if (!cargado && periodoId && cargaId && cargasListas && planeacionesListas) {
    setCargado(true)
    setForm(planeacionActual ? formDesdePlaneacion(planeacionActual) : formDesdeMateria(cargaActual?.materia))
  }

  const puedeEnviar = planeacionActual &&
    ['borrador', 'devuelta_da', 'devuelta_jc'].includes(planeacionActual.estatus)

  const todoCompleto = !!form && PASOS.every(p => pasoCompleto(p.id, form))

  // Antes de llevar al docente a la página de confirmación, se fuerza un guardado
  // inmediato (sin esperar el debounce del autoguardado) para que lo que revise ahí
  // sea exactamente lo último que capturó.
  const irARevisar = () => {
    mutSave.mutate(undefined, {
      onSuccess: () => navigate(`/docente/planeacion/${cargaId}/confirmar?periodo=${periodoId}`),
    })
  }

  if (!periodoId || !cargaId) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div>
          <p className="text-sm text-slate-500">Falta información para abrir esta instrumentación didáctica.</p>
          <Link to={periodoId ? `/docente/planeacion?periodo=${periodoId}` : '/docente/planeacion'} className="text-sm text-blue-600 hover:underline">← Volver a Mis asignaturas</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
    <div className="space-y-6">
      <Link to={`/docente/planeacion?periodo=${periodoId}`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Mis asignaturas
      </Link>

      {!form ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-6">

          {/* Barra informativa — colapsable para aprovechar el espacio vertical; las
              notificaciones de guardado/errores ya no viven aquí, se muestran como toasts. */}
          <div className="border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setInfoAbierta(v => !v)}
                className="flex items-center gap-2 min-w-0 text-left"
              >
                <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${infoAbierta ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-semibold text-slate-800 truncate">{cargaActual?.materia?.nombre ?? 'Instrumentación didáctica'}</span>
                {planeacionActual && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ESTATUS_COLOR[planeacionActual.estatus]}`}>
                    {ESTATUS_LABEL[planeacionActual.estatus]}
                  </span>
                )}
              </button>

              {!soloLectura && puedeEnviar && (
                todoCompleto ? (
                  <button
                    type="button"
                    onClick={irARevisar}
                    className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 whitespace-nowrap"
                  >
                    Revisar y enviar →
                  </button>
                ) : (
                  <span className="text-[11px] text-amber-600 text-right max-w-[220px]">
                    Completa las 4 fases para poder enviar la instrumentación.
                  </span>
                )
              )}
            </div>

            {infoAbierta && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs mt-3">
                <div><span className="text-slate-400">Periodo</span><p className="font-medium text-slate-800">{periodoActual?.nombre}</p></div>
                <div><span className="text-slate-400">Plan de estudios</span><p className="font-medium text-slate-800">{cargaActual?.materia?.carrera?.nombre ?? '—'}</p></div>
                <div><span className="text-slate-400">Clave</span><p className="font-medium text-slate-800">{cargaActual?.materia?.clave}</p></div>
                <div>
                  <span className="text-slate-400">Horas teoría-práctica-créditos</span>
                  <p className="font-medium text-slate-800">
                    {cargaActual?.materia?.horas_teoria}-{cargaActual?.materia?.horas_practica}-{cargaActual?.materia?.creditos}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Observaciones de revisión */}
          {planeacionActual?.observaciones_revision && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold text-xs mb-1">Observaciones del revisor:</p>
              {planeacionActual.observaciones_revision}
            </div>
          )}

          {/* Navegación por fases */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <button
              type="button"
              aria-label="Fase anterior"
              onClick={() => { setPaso(PASOS[Math.max(0, PASOS.findIndex(p => p.id === paso) - 1)].id); setVistaCompetencia(null) }}
              disabled={paso === PASOS[0].id}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex flex-wrap gap-1.5 flex-1">
              {PASOS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setPaso(p.id); setVistaCompetencia(null) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    paso === p.id ? 'bg-[#1a3a5c] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    paso === p.id ? 'bg-white/20' : pasoCompleto(p.id, form) ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-600'
                  }`}>
                    {pasoCompleto(p.id, form) && paso !== p.id ? '✓' : p.numero}
                  </span>
                  {p.label}
                  {pasoTieneObservacion(p.id) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Tiene observaciones del revisor" />
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              aria-label="Siguiente fase"
              onClick={() => { setPaso(PASOS[Math.min(PASOS.length - 1, PASOS.findIndex(p => p.id === paso) + 1)].id); setVistaCompetencia(null) }}
              disabled={paso === PASOS[PASOS.length - 1].id}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white bg-[#1a3a5c] hover:bg-[#234d7a] disabled:opacity-30 disabled:hover:bg-[#1a3a5c]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 1-3. Caracterización, intención didáctica y competencia de la asignatura */}
          {paso === 'generales' && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">1. Caracterización de la asignatura</label>
              <NotaRevisor items={obsPara('caracterizacion')} />
              <textarea rows={3} value={form.caracterizacion} onChange={e => set('caracterizacion', e.target.value)}
                placeholder="Aportación al perfil profesional, importancia, relación con otras asignaturas…"
                className={inputCls + ' resize-none'} disabled={soloLectura} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">2. Intención didáctica</label>
              <NotaRevisor items={obsPara('intencion_didactica')} />
              <textarea rows={3} value={form.intencion_didactica} onChange={e => set('intencion_didactica', e.target.value)}
                placeholder="Forma de abordar los contenidos, enfoque, competencias genéricas a desarrollar…"
                className={inputCls + ' resize-none'} disabled={soloLectura} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">3. Competencia de la asignatura</label>
              <NotaRevisor items={obsPara('competencia_asignatura')} />
              <textarea rows={2} value={form.competencia_asignatura} onChange={e => set('competencia_asignatura', e.target.value)}
                placeholder="¿Qué debe saber y saber hacer el estudiante como resultado de la asignatura?"
                className={inputCls + ' resize-none'} disabled={soloLectura} />
            </div>
          </div>
          )}

          {/* 4. Análisis por competencias específicas (una por unidad) */}
          {paso === 'especificas' && (() => {
            const vc = vistaCompetencia
            const comp = vc ? form.competencias[vc.idx] : null

            // ── Subvista: una categoría de una unidad ───────────────────────
            if (vc && comp) {
              const idx = vc.idx
              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <button type="button" onClick={() => setVistaCompetencia(null)}
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Regresar a la cuadrícula
                    </button>
                    <div className="flex items-center gap-1">
                      <button type="button" disabled={idx === 0}
                        onClick={() => setVistaCompetencia({ idx: idx - 1, cat: vc.cat })}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">
                        ‹
                      </button>
                      <span className="text-xs text-slate-400">Unidad {idx + 1} de {form.competencias.length}</span>
                      <button type="button" disabled={idx === form.competencias.length - 1}
                        onClick={() => setVistaCompetencia({ idx: idx + 1, cat: vc.cat })}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">
                        ›
                      </button>
                    </div>
                  </div>

                  {/* Selector de unidad — cambia de unidad manteniendo la categoría actual */}
                  {form.competencias.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {form.competencias.map((c, i) => (
                        <button key={i} type="button" onClick={() => setVistaCompetencia({ idx: i, cat: vc.cat })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            i === idx ? 'bg-[#1a3a5c] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}>
                          Unidad {c.numero}{c.nombre_unidad ? ` — ${c.nombre_unidad}` : ''}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selector de categoría — cambia de sección manteniendo la unidad actual */}
                  <div className="flex flex-wrap gap-1.5 mb-4 pb-4 border-b border-slate-100">
                    {CATEGORIAS.map(cat => (
                      <button key={cat.id} type="button" onClick={() => setVistaCompetencia({ idx, cat: cat.id })}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          cat.id === vc.cat ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'text-slate-500 hover:bg-slate-100'
                        }`}>
                        {categoriaCompleta(comp, cat.id) && <span className="w-3.5 h-3.5 rounded-full bg-green-500 text-white text-[9px] flex items-center justify-center shrink-0">✓</span>}
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                    Unidad {comp.numero}{comp.nombre_unidad ? ` — ${comp.nombre_unidad}` : ''} · {CATEGORIAS.find(c => c.id === vc.cat)?.label}
                  </p>

                  <NotaRevisor items={obsPara('especifica', { unidad: comp.numero, categoria: vc.cat })} />

                  {vc.cat === 'analisis' && (
                    <div className="space-y-5">
                      <Field label="Competencia específica (descripción)">
                        <textarea rows={2} value={comp.descripcion} onChange={e => setCompetencia(idx, { descripcion: e.target.value })}
                          className={inputCls + ' resize-none'} disabled={soloLectura} />
                      </Field>

                      {/* N — Actividades de enseñanza / aprendizaje, por fila numerada */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium text-slate-600">Actividades de enseñanza y aprendizaje</p>
                          {!soloLectura && (
                            <button type="button" onClick={() => agregarActividad(idx)} className="text-xs text-blue-600 hover:underline">+ Agregar fila</button>
                          )}
                        </div>
                        {comp.actividades.length === 0 ? (
                          <p className="text-xs text-slate-400">Sin filas registradas.</p>
                        ) : (
                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="px-2 py-1.5 text-center font-medium text-slate-500 w-8">N</th>
                                  <th className="px-2 py-1.5 text-left font-medium text-slate-500">Actividades de enseñanza</th>
                                  <th className="px-2 py-1.5 text-left font-medium text-slate-500">Actividades de aprendizaje</th>
                                  <th className="px-2 py-1.5 text-center font-medium text-slate-500 w-20">Horas T/P</th>
                                  <th className="w-10"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {comp.actividades.map((a, aIdx) => (
                                  <tr key={aIdx}>
                                    <td className="px-2 py-1.5 text-center font-semibold text-slate-500">{a.numero}</td>
                                    <td className="px-2 py-1.5">
                                      <textarea rows={2} value={a.actividad_ensenanza} onChange={e => setActividad(idx, aIdx, { actividad_ensenanza: e.target.value })}
                                        className={smallInputCls + ' resize-none'} disabled={soloLectura} />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <textarea rows={2} value={a.actividad_aprendizaje} onChange={e => setActividad(idx, aIdx, { actividad_aprendizaje: e.target.value })}
                                        className={smallInputCls + ' resize-none'} disabled={soloLectura} />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input type="number" min="0" placeholder="Teoría" value={a.horas_teoricas ?? ''}
                                        onChange={e => setActividad(idx, aIdx, { horas_teoricas: e.target.value === '' ? null : Number(e.target.value) })}
                                        className={smallInputCls + ' mb-1'} disabled={soloLectura} />
                                      <input type="number" min="0" placeholder="Práctica" value={a.horas_practicas ?? ''}
                                        onChange={e => setActividad(idx, aIdx, { horas_practicas: e.target.value === '' ? null : Number(e.target.value) })}
                                        className={smallInputCls} disabled={soloLectura} />
                                    </td>
                                    <td className="px-2 py-1.5 text-center align-top">
                                      {!soloLectura && (
                                        <button type="button" onClick={() => quitarActividad(idx, aIdx)} className="text-xs text-red-600 hover:underline">Quitar</button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Temas y subtemas, cada uno asociado a la fila (N) de actividades que le corresponde */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium text-slate-600">Temas y subtemas</p>
                          {!soloLectura && (
                            <button type="button" onClick={() => agregarSubtemaTema(idx)} className="text-xs text-blue-600 hover:underline">+ Agregar subtema</button>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {comp.subtemas.map((s, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-2">
                              <select value={s.fila ?? ''} onChange={e => setSubtemaTema(idx, sIdx, { fila: e.target.value === '' ? null : Number(e.target.value) })}
                                className={smallInputCls + ' !w-16 shrink-0'} disabled={soloLectura}>
                                <option value="">N</option>
                                {comp.actividades.map(a => <option key={a.numero} value={a.numero}>{a.numero}</option>)}
                              </select>
                              <input value={s.texto} onChange={e => setSubtemaTema(idx, sIdx, { texto: e.target.value })}
                                placeholder="Tema o subtema" className={smallInputCls + ' flex-1'} disabled={soloLectura} />
                              {!soloLectura && (
                                <button type="button" onClick={() => quitarSubtemaTema(idx, sIdx)} className="text-xs text-red-600 hover:underline shrink-0">Quitar</button>
                              )}
                            </div>
                          ))}
                          {comp.subtemas.length === 0 && (
                            <p className="text-xs text-slate-400">Sin temas ni subtemas registrados.</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-2">Desarrollo de competencias genéricas</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                          {[
                            ['Instrumentales', COMPETENCIAS_INSTRUMENTALES],
                            ['Interpersonales', COMPETENCIAS_INTERPERSONALES],
                            ['Sistémicas', COMPETENCIAS_SISTEMICAS],
                          ].map(([titulo, lista]) => (
                            <div key={titulo as string}>
                              <p className="font-semibold text-slate-500 mb-1">{titulo}</p>
                              <div className="space-y-1">
                                {(lista as string[]).map(nombre => (
                                  <label key={nombre} className="flex items-start gap-1.5 text-slate-600">
                                    <input type="checkbox" className="mt-0.5"
                                      checked={comp.competencias_genericas.includes(nombre)}
                                      onChange={() => toggleCompetenciaGenerica(idx, nombre)}
                                      disabled={soloLectura} />
                                    <span>{nombre}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {vc.cat === 'indicadores' && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium text-slate-600">Indicadores de alcance</p>
                          {!soloLectura && (
                            <button type="button" onClick={() => agregarIndicador(idx)} className="text-xs text-blue-600 hover:underline">+ Agregar</button>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {comp.indicadores_alcance.map((ind, indIdx) => (
                            <div key={indIdx} className="flex items-center gap-2">
                              <input value={ind.letra} onChange={e => setIndicador(idx, indIdx, { letra: e.target.value })} placeholder="A/B/C" className={smallInputCls + ' !w-16 shrink-0'} disabled={soloLectura} />
                              <input value={ind.indicador} onChange={e => setIndicador(idx, indIdx, { indicador: e.target.value })} placeholder="Indicador de alcance" className={smallInputCls + ' flex-1'} disabled={soloLectura} />
                              <input type="number" value={ind.valor ?? ''} onChange={e => setIndicador(idx, indIdx, { valor: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Valor %" className={smallInputCls + ' !w-20 shrink-0'} disabled={soloLectura} />
                              {!soloLectura && (
                                <button type="button" onClick={() => quitarIndicador(idx, indIdx)} className="text-xs text-red-600 hover:underline shrink-0">Quitar</button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1.5">Niveles de desempeño</p>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-2 py-1.5 text-left font-medium text-slate-500">Nivel</th>
                                <th className="px-2 py-1.5 text-left font-medium text-slate-500 w-20">Rango</th>
                                <th className="px-2 py-1.5 text-left font-medium text-slate-500">Indicadores de alcance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {comp.niveles_desempeno.map((n, nivelIdx) => (
                                <tr key={n.nivel}>
                                  <td className="px-2 py-1 font-medium text-slate-700 whitespace-nowrap">{n.nivel}</td>
                                  <td className="px-2 py-1 text-slate-400 whitespace-nowrap">{NIVEL_RANGO[n.nivel]}</td>
                                  <td className="px-2 py-1">
                                    <input value={n.indicadores} onChange={e => setNivelDesempeno(idx, nivelIdx, e.target.value)} className={smallInputCls} disabled={soloLectura} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium text-slate-600">Evidencias de aprendizaje y evaluación formativa</p>
                          {!soloLectura && (
                            <button type="button" onClick={() => agregarFilaMatriz(idx)} className="text-xs text-blue-600 hover:underline">+ Agregar evidencia</button>
                          )}
                        </div>

                        {(() => {
                          const limiteEvid = limiteEvidencia(comp.porcentaje)
                          const sumaEvidencias = comp.matriz_evaluacion.reduce((acc, f) => acc + (f.porcentaje ?? 0), 0)
                          return (
                            <>
                              {comp.matriz_evaluacion.length > 0 && comp.matriz_evaluacion.length < MIN_EVIDENCIAS_POR_UNIDAD && (
                                <p className="text-[11px] text-amber-600 mb-1.5">
                                  Se requieren al menos {MIN_EVIDENCIAS_POR_UNIDAD} evidencias de aprendizaje por unidad.
                                </p>
                              )}
                              <div className="space-y-2">
                                {comp.matriz_evaluacion.map((fila, filaIdx) => {
                                  const excedeLimite = fila.porcentaje != null && fila.porcentaje > limiteEvid
                                  return (
                                    <div key={filaIdx} className="border border-slate-100 rounded-lg p-2 space-y-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <input value={fila.evidencia} onChange={e => setFilaMatriz(idx, filaIdx, { evidencia: e.target.value })} placeholder="Evidencia de aprendizaje" className={smallInputCls + ' flex-1'} disabled={soloLectura} />
                                        <input type="number" value={fila.porcentaje ?? ''} onChange={e => setFilaMatriz(idx, filaIdx, { porcentaje: e.target.value === '' ? null : Number(e.target.value) })} placeholder="%" className={smallInputCls + ' !w-20 shrink-0' + (excedeLimite ? ' !border-red-400' : '')} disabled={soloLectura} />
                                        {!soloLectura && (
                                          <button type="button" onClick={() => quitarFilaMatriz(idx, filaIdx)} className="text-xs text-red-600 hover:underline shrink-0">Quitar</button>
                                        )}
                                      </div>
                                      {excedeLimite && (
                                        <p className="text-[11px] text-red-600">Máximo {limiteEvid}% (40% del {comp.porcentaje ?? 0}% de la unidad).</p>
                                      )}
                                      {!!comp.indicadores_alcance.length && (
                                        <div className="flex flex-wrap gap-2">
                                          {comp.indicadores_alcance.filter(ind => ind.letra).map(ind => (
                                            <label key={ind.letra} className="flex items-center gap-1 text-xs text-slate-600">
                                              <input type="checkbox" checked={fila.indicadores.includes(ind.letra)}
                                                onChange={() => toggleIndicadorEnFila(idx, filaIdx, ind.letra)} disabled={soloLectura} />
                                              {ind.letra}
                                            </label>
                                          ))}
                                        </div>
                                      )}
                                      <input value={fila.evaluacion_formativa} onChange={e => setFilaMatriz(idx, filaIdx, { evaluacion_formativa: e.target.value })}
                                        placeholder="Evaluación formativa de la competencia (rúbrica, lista de cotejo…)" className={smallInputCls} disabled={soloLectura} />
                                    </div>
                                  )
                                })}
                              </div>
                              {comp.matriz_evaluacion.length > 0 && (
                                <p className={`text-[11px] mt-1.5 ${sumaEvidencias === (comp.porcentaje ?? 0) ? 'text-green-700' : 'text-amber-600'}`}>
                                  Suma de evidencias: {sumaEvidencias}% de {comp.porcentaje ?? 0}% asignado a la unidad.
                                </p>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )}

                  {vc.cat === 'fuentes' && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-medium text-slate-600">Fuentes de información</p>
                        {!soloLectura && (
                          <button type="button" onClick={() => abrirModalFuente(idx, null)} className="text-xs text-blue-600 hover:underline">+ Agregar fuente</button>
                        )}
                      </div>
                      {comp.fuentes_informacion.length === 0 && (
                        <p className="text-xs text-slate-400">Sin fuentes de información registradas.</p>
                      )}
                      <div className="space-y-1.5">
                        {comp.fuentes_informacion.map((f, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-2 border border-slate-100 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              {f.tipo && (
                                <span className="inline-block text-[10px] font-medium text-blue-700 bg-blue-50 rounded-full px-2 py-0.5 mb-1">
                                  {TIPO_FUENTE_LABEL[f.tipo]}
                                </span>
                              )}
                              <p className="text-xs text-slate-700">{citarFuente(f)}</p>
                            </div>
                            {!soloLectura && (
                              <div className="flex items-center gap-2 shrink-0">
                                <button type="button" onClick={() => abrirModalFuente(idx, fIdx)} className="text-xs text-blue-600 hover:underline">Editar</button>
                                <button type="button" onClick={() => quitarFuente(idx, fIdx)} className="text-xs text-red-600 hover:underline">Quitar</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {vc.cat === 'apoyo' && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-2">Apoyo didáctico</p>
                      <p className="text-xs text-slate-400 mb-2">Selecciona los que aplican; si el que necesitas no aparece, agrégalo abajo.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
                        {[...new Set([...APOYOS_DIDACTICOS_CATALOGO, ...comp.apoyos_didacticos])].map(nombre => (
                          <label key={nombre} className="flex items-center gap-2 text-xs text-slate-600">
                            <input type="checkbox" checked={comp.apoyos_didacticos.includes(nombre)}
                              onChange={() => toggleApoyo(idx, nombre)} disabled={soloLectura} />
                            <span>{nombre}</span>
                          </label>
                        ))}
                      </div>
                      {!soloLectura && (
                        <div className="flex items-center gap-1.5">
                          <input
                            value={nuevoApoyo[idx] ?? ''}
                            onChange={e => setNuevoApoyo(prev => ({ ...prev, [idx]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                agregarApoyoPersonalizado(idx, nuevoApoyo[idx] ?? '')
                                setNuevoApoyo(prev => ({ ...prev, [idx]: '' }))
                              }
                            }}
                            placeholder="Agregar apoyo didáctico personalizado…"
                            className={smallInputCls + ' flex-1'}
                          />
                          <button type="button"
                            onClick={() => { agregarApoyoPersonalizado(idx, nuevoApoyo[idx] ?? ''); setNuevoApoyo(prev => ({ ...prev, [idx]: '' })) }}
                            className="text-xs text-blue-600 hover:underline shrink-0">+ Agregar</button>
                        </div>
                      )}
                    </div>
                  )}

                  {vc.cat === 'practicas' && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-medium text-slate-600">Prácticas</p>
                        {!soloLectura && (
                          <button type="button" onClick={() => agregarPractica(idx)} className="text-xs text-blue-600 hover:underline">+ Agregar práctica</button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {comp.practicas.map((p, pIdx) => {
                          const esAula = aulas.some(a => a.nombre === p.lugar)
                          const esOtro = !!p.lugar && !esAula
                          return (
                            <div key={pIdx} className="grid grid-cols-5 gap-1.5 items-start">
                              <input value={p.nombre} onChange={e => setPractica(idx, pIdx, { nombre: e.target.value })} placeholder="Nombre de la práctica" className={smallInputCls + ' col-span-2'} disabled={soloLectura} />
                              <input value={p.requisitos} onChange={e => setPractica(idx, pIdx, { requisitos: e.target.value })} placeholder="Requisitos" className={smallInputCls} disabled={soloLectura} />
                              <input value={p.semana} onChange={e => setPractica(idx, pIdx, { semana: e.target.value })} placeholder="Semana" className={smallInputCls} disabled={soloLectura} />
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={esOtro ? '__otro__' : p.lugar}
                                    onChange={e => setPractica(idx, pIdx, { lugar: e.target.value === '__otro__' ? '' : e.target.value })}
                                    className={smallInputCls} disabled={soloLectura}
                                  >
                                    <option value="">Lugar</option>
                                    {aulas.map(a => <option key={a.id} value={a.nombre}>{a.nombre}</option>)}
                                    <option value="__otro__">Otro lugar (fuera del instituto)</option>
                                  </select>
                                  {!soloLectura && (
                                    <button type="button" onClick={() => quitarPractica(idx, pIdx)} className="text-xs text-red-600 hover:underline shrink-0">Quitar</button>
                                  )}
                                </div>
                                {esOtro && (
                                  <input value={p.lugar} onChange={e => setPractica(idx, pIdx, { lugar: e.target.value })}
                                    placeholder="Especifica el lugar" className={smallInputCls} disabled={soloLectura} />
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            // ── Vista principal: cuadrícula de unidades × categorías ────────
            const sumaPorcentajes = form.competencias.reduce((acc, c) => acc + (c.porcentaje ?? 0), 0)
            return (
              <div className="pt-0">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">4. Análisis por competencias específicas</label>
                  {!soloLectura && (
                    <button type="button" onClick={agregarCompetencia} className="text-xs font-medium text-blue-600 hover:underline">
                      + Agregar unidad / competencia específica
                    </button>
                  )}
                </div>

                {form.competencias.length === 0 && (
                  <p className="text-xs text-slate-400 py-3">Sin competencias específicas registradas.</p>
                )}

                <div className="space-y-2.5">
                  {form.competencias.map((c, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl px-4 py-3.5 hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-[#1a3a5c] text-white text-[11px] font-semibold flex items-center justify-center">
                          {c.numero}
                        </span>
                        <input value={c.nombre_unidad} onChange={e => setCompetencia(idx, { nombre_unidad: e.target.value })}
                          placeholder="Nombre de la unidad"
                          className="flex-1 min-w-0 text-sm font-semibold text-slate-700 border-0 border-b border-transparent hover:border-slate-300 focus:border-slate-400 focus:outline-none px-0 py-0.5 bg-transparent disabled:bg-transparent"
                          disabled={soloLectura} />
                        <div className="flex items-center gap-1 shrink-0 text-slate-400">
                          <input type="number" min="0" max="100" value={c.porcentaje ?? ''}
                            onChange={e => setCompetencia(idx, { porcentaje: e.target.value === '' ? null : Number(e.target.value) })}
                            placeholder="%" className={smallInputCls + ' !w-14 text-right'} disabled={soloLectura} />
                          <span className="text-xs">%</span>
                        </div>
                        {!soloLectura && (
                          <button type="button" onClick={() => quitarCompetencia(idx)} className="text-xs text-slate-400 hover:text-red-600 shrink-0 transition-colors">Quitar</button>
                        )}
                      </div>
                      {c.porcentaje != null && c.porcentaje > LIMITE_PORCENTAJE_UNIDAD && (
                        <p className="text-[11px] text-red-600 -mt-2 mb-2">Ninguna unidad puede superar el {LIMITE_PORCENTAJE_UNIDAD}% de la calificación final.</p>
                      )}
                      <NotaRevisor items={obsPara('especifica', { unidad: c.numero }).filter(o => !o.categoria)} />
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 -mx-2">
                        {CATEGORIAS.map(cat => (
                          <button key={cat.id} type="button" onClick={() => setVistaCompetencia({ idx, cat: cat.id })}
                            className="group flex flex-col items-center gap-1.5 px-1 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                            <FolderIcon completo={categoriaCompleta(c, cat.id)} conObservacion={obsPara('especifica', { unidad: c.numero, categoria: cat.id }).length > 0} />
                            <span className="text-[11px] text-slate-500 text-center leading-tight">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {form.competencias.length > 0 && (
                  <p className={`text-xs mt-3 ${sumaPorcentajes === 100 ? 'text-green-700' : 'text-amber-600'}`}>
                    Suma de porcentajes por unidad: {sumaPorcentajes}%. En sumatoria debe cubrir el 100%.
                  </p>
                )}
              </div>
            )
          })()}

          {/* 5. Dosificación (avance real vs. planeado, por subtema) */}
          {paso === 'dosificacion' && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">5. Dosificación</label>
            <p className="text-xs text-slate-400 mb-3">
              Programa cada subtema en un rango de semanas y, conforme avance el curso, registra la semana en que
              realmente lo impartiste — el estatus se calcula solo: a tiempo, adelantado o con atraso.
            </p>

            {form.competencias.length === 0 && (
              <p className="text-xs text-slate-400 py-3">Registra primero las unidades en "Competencias específicas".</p>
            )}

            <div className="space-y-4">
              {form.competencias.map((comp, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700">
                      Unidad {comp.numero}{comp.nombre_unidad ? ` — ${comp.nombre_unidad}` : ''}
                    </p>
                    {!soloLectura && (
                      <button type="button" onClick={() => agregarSubtema(idx)} className="text-xs text-blue-600 hover:underline">+ Agregar subtema</button>
                    )}
                  </div>
                  <NotaRevisor items={obsPara('dosificacion', { unidad: comp.numero })} />
                  {comp.dosificacion.length === 0 ? (
                    <p className="text-xs text-slate-400">Sin subtemas dosificados.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-medium text-slate-500">Subtema</th>
                            <th className="px-2 py-1.5 text-center font-medium text-slate-500 w-20">Sem. inicio</th>
                            <th className="px-2 py-1.5 text-center font-medium text-slate-500 w-20">Sem. fin</th>
                            <th className="px-2 py-1.5 text-center font-medium text-slate-500 w-24">Sem. realizado</th>
                            <th className="px-2 py-1.5 text-center font-medium text-slate-500 w-24">Estatus</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {comp.dosificacion.map((s, sIdx) => {
                            const estado = estadoSubtema(s)
                            return (
                              <tr key={sIdx}>
                                <td className="px-2 py-1">
                                  <input value={s.subtema} onChange={e => setSubtema(idx, sIdx, { subtema: e.target.value })}
                                    placeholder="Nombre del subtema" className={smallInputCls} disabled={soloLectura} />
                                </td>
                                <td className="px-2 py-1">
                                  <input type="number" min="1" max="16" value={s.semana_inicio ?? ''}
                                    onChange={e => setSubtema(idx, sIdx, { semana_inicio: e.target.value === '' ? null : Number(e.target.value) })}
                                    className={smallInputCls} disabled={soloLectura} />
                                </td>
                                <td className="px-2 py-1">
                                  <input type="number" min="1" max="16" value={s.semana_fin ?? ''}
                                    onChange={e => setSubtema(idx, sIdx, { semana_fin: e.target.value === '' ? null : Number(e.target.value) })}
                                    className={smallInputCls} disabled={soloLectura} />
                                </td>
                                <td className="px-2 py-1">
                                  <input type="number" min="1" max="16" value={s.semana_realizado ?? ''}
                                    onChange={e => setSubtema(idx, sIdx, { semana_realizado: e.target.value === '' ? null : Number(e.target.value) })}
                                    className={smallInputCls} disabled={soloLectura} />
                                </td>
                                <td className="px-2 py-1 text-center">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ESTADO_DOSIFICACION_COLOR[estado]}`}>
                                    {ESTADO_DOSIFICACION_LABEL[estado]}
                                  </span>
                                </td>
                                <td className="px-2 py-1 text-center">
                                  {!soloLectura && (
                                    <button type="button" onClick={() => quitarSubtema(idx, sIdx)} className="text-xs text-red-600 hover:underline">Quitar</button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}

          {/* 6. Calendarización de evaluación */}
          {paso === 'calendarizacion' && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">6. Calendarización de evaluación</label>
            <p className="text-xs text-slate-400 mb-2">ED = Evaluación diagnóstica · EF = Evaluación formativa · ES = Evaluación sumativa · TP = Tiempo planeado · TR = Tiempo real · SD = Seguimiento departamental</p>
            <NotaRevisor items={obsPara('calendarizacion')} />
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium text-slate-500">Semana</th>
                    <th className="px-2 py-1.5 text-left font-medium text-slate-500">Evaluación</th>
                    <th className="px-2 py-1.5 text-center font-medium text-slate-500">TP</th>
                    <th className="px-2 py-1.5 text-center font-medium text-slate-500">TR</th>
                    <th className="px-2 py-1.5 text-center font-medium text-slate-500">SD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.calendarizacion.map((s, i) => (
                    <tr key={s.semana}>
                      <td className="px-2 py-1 font-medium text-slate-700">{s.semana}</td>
                      <td className="px-2 py-1">
                        <select value={s.tipo_evaluacion} onChange={e => setSemana(i, { tipo_evaluacion: e.target.value as SemanaCalendarizacion['tipo_evaluacion'] })} className={smallInputCls} disabled={soloLectura}>
                          <option value="">—</option>
                          <option value="ED">ED</option>
                          <option value="EF">EF</option>
                          <option value="ES">ES</option>
                        </select>
                      </td>
                      <td className="px-2 py-1 text-center"><input type="checkbox" checked={s.tp} onChange={e => setSemana(i, { tp: e.target.checked })} disabled={soloLectura} /></td>
                      <td className="px-2 py-1 text-center"><input type="checkbox" checked={s.tr} onChange={e => setSemana(i, { tr: e.target.checked })} disabled={soloLectura} /></td>
                      <td className="px-2 py-1 text-center"><input type="checkbox" checked={s.sd} onChange={e => setSemana(i, { sd: e.target.checked })} disabled={soloLectura} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}

      {modalFuente && (
        <ModalWrap
          title={modalFuente.fIdx != null ? 'Editar fuente de información' : 'Agregar fuente de información'}
          onClose={() => setModalFuente(null)}
          onSave={guardarFuenteModal}
        >
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de fuente *</label>
            <select
              value={draftFuente.tipo}
              onChange={e => setDraftFuente(f => ({ tipo: e.target.value as TipoFuente, titulo: f.titulo, autor: f.autor, anio: f.anio }))}
              className={inputCls}
            >
              <option value="">— Selecciona —</option>
              {TIPOS_FUENTE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
            <input value={draftFuente.titulo} onChange={e => setDraftFuente(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Título del libro, artículo, página…" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Autor{draftFuente.tipo === 'sitio_web' ? ' / Organización' : ''}</label>
            <input value={draftFuente.autor ?? ''} onChange={e => setDraftFuente(f => ({ ...f, autor: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Año</label>
            <input value={draftFuente.anio ?? ''} onChange={e => setDraftFuente(f => ({ ...f, anio: e.target.value }))} className={inputCls} />
          </div>

          {draftFuente.tipo === 'impreso' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Editorial</label>
                <input value={draftFuente.editorial ?? ''} onChange={e => setDraftFuente(f => ({ ...f, editorial: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Edición</label>
                <input value={draftFuente.edicion ?? ''} onChange={e => setDraftFuente(f => ({ ...f, edicion: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ciudad</label>
                <input value={draftFuente.ciudad ?? ''} onChange={e => setDraftFuente(f => ({ ...f, ciudad: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ISBN</label>
                <input value={draftFuente.isbn ?? ''} onChange={e => setDraftFuente(f => ({ ...f, isbn: e.target.value }))} className={inputCls} />
              </div>
            </>
          )}

          {draftFuente.tipo === 'articulo' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Revista</label>
                <input value={draftFuente.revista ?? ''} onChange={e => setDraftFuente(f => ({ ...f, revista: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Volumen</label>
                <input value={draftFuente.volumen ?? ''} onChange={e => setDraftFuente(f => ({ ...f, volumen: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Páginas</label>
                <input value={draftFuente.paginas ?? ''} onChange={e => setDraftFuente(f => ({ ...f, paginas: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">DOI</label>
                <input value={draftFuente.doi ?? ''} onChange={e => setDraftFuente(f => ({ ...f, doi: e.target.value }))} className={inputCls} />
              </div>
            </>
          )}

          {(draftFuente.tipo === 'sitio_web' || draftFuente.tipo === 'digital') && (
            <>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">URL</label>
                <input value={draftFuente.url ?? ''} onChange={e => setDraftFuente(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://…" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {draftFuente.tipo === 'digital' ? 'Plataforma (Moodle, e-book…)' : 'Sitio / plataforma'}
                </label>
                <input value={draftFuente.plataforma ?? ''} onChange={e => setDraftFuente(f => ({ ...f, plataforma: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de consulta</label>
                <input type="date" value={draftFuente.fecha_consulta ?? ''} onChange={e => setDraftFuente(f => ({ ...f, fecha_consulta: e.target.value }))} className={inputCls} />
              </div>
            </>
          )}
        </ModalWrap>
      )}
    </div>
    </div>
  )
}
