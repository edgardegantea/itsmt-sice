import apiClient from '../../../config/apiClient'
import { errorDeBlob } from '../../../utils/apiErrors'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface MateriaTemaTema {
  tema: string
  subtemas?: string[]
}

export interface Materia {
  id: string
  carrera_id: string
  clave: string
  nombre: string
  semestre: number
  creditos: number
  horas_teoria: number
  horas_practica: number
  tipo: 'obligatoria' | 'optativa'
  activa: boolean
  clave_oficial_tecnm?: string
  modulo_sabatino?: 1 | 2 | null
  carrera?: { id: string; nombre: string; clave: string }
  // Programa TecNM
  satca?: string
  caracterizacion?: string
  intencion_didactica?: string
  competencia_especifica?: string
  competencias_previas?: string
  temario?: MateriaTemaTema[]
  actividades_aprendizaje?: { tema: string; competencias: string; actividades: string[] }[]
  practicas?: { tema: string; lista: string[] }[]
  proyecto_asignatura?: string
  evaluacion?: string
  fuentes_informacion?: string[]
  documento_path?: string
  documento_url?: string
}

export interface Plantel {
  id: number
  nombre: string
  clave: string
  activo: boolean
}

export interface GrupoHorarioDia {
  id?: string
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fin: string
}

export interface Grupo {
  id: string
  carrera_id: string
  periodo_id: string
  plantel_id?: number | null
  clave: string
  semestre: number
  turno: 'matutino' | 'vespertino' | 'sabatino'
  capacidad: number
  activo: boolean
  horarios_liberados: boolean
  alumnos_count?: number
  horarios_dias?: GrupoHorarioDia[]
  carrera?: { id: string; nombre: string; clave: string }
  periodo?: { id: string; nombre: string; codigo?: string; activo?: boolean }
  plantel?: Plantel | null
  alumnos?: AlumnoGrupo[]
  cargas?: CargaAcademica[]
}

export interface AlumnoGrupo {
  id: string
  numero_control: string
  semestre_actual: number
  // `user.id` es el id real usado como alumno_id en asistencias — distinto de `id`
  // arriba, que es el id de la fila de la tabla `alumnos` (no el de `users`).
  user?: { id: string; name: string; email: string }
  inscripcion?: { aspirante?: { nombres: string; apellido_paterno: string; apellido_materno?: string } }
  pivot?: { fecha_asignacion: string }
}

export interface CargaAcademica {
  id: string
  docente_id: string
  materia_id: string
  periodo_id: string
  aula_id?: string
  horas_semana: number
  estado?: 'pendiente' | 'confirmada' | 'conflicto'
  docente?: { id: string; name: string; email: string }
  materia?: Materia
  grupos?: Grupo[]
  periodo?: { id: string; nombre: string }
  aula?: { id: string; nombre: string; tipo: string; capacidad: number }
  horarios?: Horario[]
  instrumentacion_liberada?: boolean
}

/**
 * El constructor de horarios crea una CargaAcademica independiente por cada
 * bloque día+hora que se asigna (a propósito: permite repartir una materia en
 * grupos distintos según el día) — así, una materia con 5 horas repartidas en
 * la semana puede terminar como 5 filas de CargaAcademica distintas, cada una
 * con un solo Horario. Para el pase de lista eso es ruido: el docente debe ver
 * "Ecología — Grupo X" una sola vez, con los 5 días disponibles en el
 * calendario. Esta función fusiona, por (materia_id + primer grupo), todas las
 * cargas equivalentes en una sola (la de id más antiguo/menor, ya que los ids
 * son UUIDv7 y por tanto ordenables por creación) con la unión de sus
 * horarios. Debe aplicarse en cualquier lugar que liste cargas para pasar
 * lista o generar reportes de asistencia, para que las sesiones siempre se
 * registren bajo el mismo carga_academica_id sin importar qué día se pasa lista.
 */
export function mergeCargasPorAsignatura(cargas: CargaAcademica[]): CargaAcademica[] {
  const grupos = new Map<string, CargaAcademica[]>()

  for (const c of cargas) {
    const grupoId = c.grupos?.[0]?.id ?? '_sin_grupo'
    const key = `${c.materia_id}|${grupoId}`
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(c)
  }

  const resultado: CargaAcademica[] = []
  for (const equivalentes of grupos.values()) {
    const ordenadas = [...equivalentes].sort((a, b) => a.id.localeCompare(b.id))
    const canonica = ordenadas[0]
    const horarios = ordenadas.flatMap(c => c.horarios ?? [])
    resultado.push({ ...canonica, horarios })
  }

  return resultado
}

export interface MallaCurricular {
  id: string
  carrera_id: string
  materia_id: string
  semestre: number
  es_especialidad: boolean
  materia?: Materia
  carrera?: { id: string; nombre: string; clave: string }
}

export interface Aula {
  id: string
  nombre: string
  capacidad: number
  tipo: 'salon' | 'laboratorio' | 'taller'
  activa: boolean
}

export interface BloqueOcupacion {
  dia_semana: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado'
  hora_inicio: string
  hora_fin: string
  materia?: string
  grupo?: string
  horas: number
}

export type NivelRiesgo = 'alto' | 'medio' | 'bajo'

export interface AlumnoRiesgo {
  alumno_id: string
  numero_control: string
  nombre?: string
  carrera?: string
  carrera_id?: string
  semestre_actual: number
  grupos: string[]
  pct_reprobacion: number
  pct_inasistencia: number
  total_incidencias_grupo: number
  alerta_baja_definitiva: boolean
  score: number
  nivel_riesgo: NivelRiesgo
}

export type EstatusIncidenciaClase =
  | 'sin_novedad' | 'docente_ausente' | 'aula_vacia' | 'grupo_incorrecto'
  | 'aula_incorrecta' | 'alumnos_incompletos' | 'problema_infraestructura' | 'otro'

export interface AlumnoDesercionTemprana {
  alumno_id: string
  numero_control: string
  nombre?: string
  carrera?: string
  carrera_id?: string
  semestre_actual: number
  grupos: string[]
  pct_inasistencia_temprana: number
  nunca_asistio: boolean
  total_sesiones_evaluadas: number
  total_incidencias_grupo: number
  score: number
  nivel_riesgo: NivelRiesgo
}

export type EstatusTicketMantenimiento = 'abierto' | 'en_progreso' | 'resuelto'

export interface TicketMantenimiento {
  id: string
  incidencia_clase_id?: string | null
  aula_id: string
  reportado_por_id: string
  atendido_por_id?: string | null
  descripcion: string
  estatus: EstatusTicketMantenimiento
  notas_resolucion?: string | null
  resuelto_en?: string | null
  created_at: string
  aula?: Aula
  reportado_por?: { id: string; name: string }
  atendido_por?: { id: string; name: string } | null
}

export interface IncidenciaClase {
  id: string
  periodo_id: string
  grupo_id: string
  carga_academica_id?: string | null
  docente_id?: string | null
  aula_id?: string | null
  registrado_por_id: string
  fecha: string
  hora_revision: string
  dia_semana?: string | null
  estatus: EstatusIncidenciaClase
  docente_presente?: boolean | null
  coincide_horario: boolean
  alumnos_presentes?: number | null
  observaciones?: string | null
  created_at: string
  periodo?: { id: string; nombre: string }
  grupo?: { id: string; clave: string; semestre: number; carrera?: { id: string; nombre: string } }
  carga_academica?: CargaAcademica
  docente?: { id: string; name: string; email: string }
  aula?: Aula
  registrado_por?: { id: string; name: string }
}

export interface TorreControlAula {
  id: string
  nombre: string
  tipo: 'salon' | 'laboratorio' | 'taller'
  ocupada: boolean
  materia?: string
  docente?: string
  grupo?: string
  incidencias_hoy: number
  ultima_incidencia_estatus?: EstatusIncidenciaClase
}

export interface TorreControl {
  dia_semana: string
  hora: string
  aulas: TorreControlAula[]
  aulas_ocupadas: number
  aulas_total: number
  incidencias_hoy: { total: number; con_novedad: number }
  asistencia_hoy: { esperadas: number; registradas: number; pct: number | null }
  incidencias_recientes: IncidenciaClase[]
}

export interface InsigniaDocente { icono: string; label: string }

export interface RankingDocente {
  docente_id: string
  nombre?: string
  score: number
  pct_captura: number | null
  pct_asistencia: number | null
  pct_sin_novedad: number
  total_incidencias: number
  insignias: InsigniaDocente[]
  posicion: number
}

export interface AulaFantasma {
  aula: string
  grupo: string
  carrera: string
  materia?: string
  docente_esperado?: string
  total_discrepancias: number
  ultima_fecha: string
  estatus_reportados: string[]
}

export interface SugerenciaReubicacion {
  carga_academica_id: string
  materia?: string
  docente?: string
  grupo: string
  horarios: string[]
  aulas_candidatas: { id: string; nombre: string; capacidad: number }[]
}

export interface SaludCarrera {
  carrera_id: string
  carrera: string
  score: number | null
  pct_aprobacion: number | null
  pct_sin_novedad: number | null
  pct_cumplimiento_docente: number | null
  historico: { semana: string; score: number }[]
  tendencia: number | null
}

export interface ModoExamen {
  id: string
  periodo_id: string
  fecha: string
  activado_por_id: string
  activado_por?: { name: string }
  created_at: string
}

export interface PasaporteDocente {
  docente: { id: string; name: string; email: string }
  periodo: { id: string; nombre: string }
  materias: { materia?: string; grupo?: string }[]
  asistencia: { esperadas: number; registradas: number; pct: number | null }
  captura: { pct: number | null; total_cargas_evaluadas: number }
  incidencias: { total: number; con_novedad: number }
}

export interface HorarioActualAula {
  aula: Aula
  dia_semana: string
  hora: string
  carga: CargaAcademica | null
  grupo: Grupo | null
}

export interface OcupacionAula {
  aula_id: string
  nombre: string
  tipo: 'salon' | 'laboratorio' | 'taller'
  capacidad: number
  activa: boolean
  horas_ocupadas: number
  horas_disponibles: number
  pct_ocupacion: number
  total_bloques: number
  bloques: BloqueOcupacion[]
}

export interface Horario {
  id: string
  carga_academica_id: string
  dia_semana: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado'
  hora_inicio: string
  hora_fin: string
  carga_academica?: CargaAcademica
}

export type EstatusPlaneacion = 'borrador' | 'enviada_da' | 'devuelta_da' | 'enviada_jc' | 'devuelta_jc' | 'liberada'

// ── Indicadores / estadísticas de calificaciones ──────────────────────────────
export interface IndicadorPromedioCarrera {
  carrera_id: string
  carrera: string
  periodo_id: string
  periodo: string
  promedio_general: number | null
  total_calificaciones: number
}
export interface IndicadorReprobacionCarrera {
  carrera_id: string
  carrera: string
  periodo_id: string
  periodo: string
  total_calificaciones: number
  total_reprobados: number
  pct_reprobacion: number
}
export interface IndicadorReprobacionGrupo {
  grupo_id: string
  grupo: string
  semestre: number
  carrera_id: string
  carrera: string
  total_calificaciones: number
  total_reprobados: number
  pct_reprobacion: number
}
export interface IndicadorDesercion {
  carrera_id: string
  carrera: string
  periodo_id: string
  periodo: string
  total_inscritos: number
  total_desertores: number
  porcentaje_desercion: number
}

/** TecNM-AC-PO-003 §4.8/4.9 — indicador de alcance de una competencia específica. */
export interface IndicadorAlcance {
  letra: string
  indicador: string
  valor: number | null
}

/** TecNM-AC-PO-003 §4.10 — niveles de desempeño (5 filas fijas, rango numérico estándar institucional). */
export type NivelDesempeno = 'Excelente' | 'Notable' | 'Bueno' | 'Suficiente' | 'Insuficiente'
export interface FilaNivelDesempeno {
  nivel: NivelDesempeno
  indicadores: string
}

/** Fuente de información de una competencia/unidad específica — el tipo determina qué
 * subconjunto de campos de referencia bibliográfica aplica (ver TIPOS_FUENTE en
 * PlaneacionEditorPage.tsx para el catálogo de campos por tipo). */
export type TipoFuente = 'impreso' | 'articulo' | 'sitio_web' | 'digital'

export interface FuenteInformacion {
  tipo: TipoFuente | ''
  titulo: string
  autor?: string
  anio?: string
  editorial?: string
  edicion?: string
  ciudad?: string
  isbn?: string
  revista?: string
  volumen?: string
  paginas?: string
  doi?: string
  url?: string
  fecha_consulta?: string
  plataforma?: string
}

/** Práctica asociada a una competencia/unidad específica. */
export interface PracticaUnidad {
  nombre: string
  requisitos: string[]
  semana: number | null
  lugar: string
  /** Competencia específica de la práctica — se precarga con la de la unidad al crearla,
   * pero el docente puede editarla si esta práctica en particular apunta a otra cosa. */
  competencia_especifica: string
}

/** TecNM-AC-PO-003 §4.11 — evidencia de aprendizaje y evaluación formativa de una competencia
 * específica: qué indicadores de alcance cubre (checklist) y cómo se evalúa. */
export interface FilaMatrizEvaluacion {
  evidencia: string
  porcentaje: number | null
  indicadores: string[]
  evaluacion_formativa: string
}

/** TecNM-AC-PO-003 §4 — Análisis por competencias específicas (bloque repetible, uno por unidad/tema). */
/** Dosificación semanal de un subtema (TecNM-AC-PO-003 — seguimiento de avance real vs.
 * planeado, con semáforo: a tiempo / adelantado / atrasado). */
export interface SubtemaDosificado {
  subtema: string
  semana_inicio: number | null
  semana_fin: number | null
  /** Semana en la que el docente realmente impartió el subtema (bitácora de avance). */
  semana_realizado: number | null
}

/** Fila numerada de actividades de enseñanza/aprendizaje (TecNM-AC-PO-003 §4 "Análisis por
 * competencias") — cada subtema se asocia a una de estas filas mediante su número. */
export interface FilaActividad {
  numero: number
  actividad_ensenanza: string
  actividad_aprendizaje: string
  horas_teoricas: number | null
  horas_practicas: number | null
}

/** Subtema del temario de la unidad, asociado a una o más filas de actividades (por número). */
export interface SubtemaActividad {
  texto: string
  fila: number | null
  filas?: number[]
}

export interface CompetenciaEspecifica {
  numero: number
  numero_unidad?: number
  nombre_unidad: string
  /** Porcentaje que aporta esta unidad/competencia específica a la calificación final de la
   * asignatura (suma de todas las unidades debe ser 100%). */
  porcentaje: number | null
  descripcion: string
  subtemas: SubtemaActividad[]
  actividades: FilaActividad[]
  competencias_genericas: string[]
  indicadores_alcance: IndicadorAlcance[]
  niveles_desempeno: FilaNivelDesempeno[]
  matriz_evaluacion: FilaMatrizEvaluacion[]
  fuentes_informacion: FuenteInformacion[]
  apoyos_didacticos: string[]
  practicas: PracticaUnidad[]
  dosificacion: SubtemaDosificado[]
}

/** TecNM-AC-PO-003 §6 — Calendarización de evaluación (16 semanas fijas). */
export interface SemanaCalendarizacion {
  semana: number
  tipo_evaluacion: 'ED' | 'EF' | 'ES' | ''
  tp: boolean
  tr: boolean
  sd: boolean
}

/** Sección de la instrumentación a la que se ancla una observación de revisión — coincide
 * con la estructura del editor del docente para que la observación se muestre exactamente
 * donde debe corregirse. */
export type SeccionObservacion =
  | 'caracterizacion' | 'intencion_didactica' | 'competencia_asignatura'
  | 'especifica' | 'dosificacion' | 'calendarizacion'

/** Observación de Desarrollo Académico / Jefatura de Carrera anclada a una sección concreta
 * de la instrumentación (y, para 'especifica'/'dosificacion', a una unidad y opcionalmente
 * una categoría dentro de ella — análisis, indicadores, fuentes, apoyo, prácticas). */
export interface ObservacionCampo {
  id: string
  seccion: SeccionObservacion
  unidad?: number | null
  categoria?: string | null
  texto: string
}

export interface ComentarioPlaneacion {
  id: string
  seccion: SeccionObservacion
  unidad: number | null
  categoria: string | null
  mensaje: string
  resuelto: boolean
  autor: string | null
  autor_id: string | null
  created_at: string
}

export interface ArchivoPlaneacion {
  id: string
  unidad: number | null
  nombre_original: string
  mime_type: string | null
  tamano_bytes: number
  subido_por: string | null
  subido_por_id: string | null
  created_at: string
}

export interface ResultadoBusquedaPlaneacion {
  planeacion_id: string
  carga_academica_id: string
  materia: string | null
  periodo: string | null
  periodo_id: string | null
  coincidencias: { campo: string; unidad: number | null; texto: string }[]
  total_coincidencias: number
}

export interface ComparativaGrupos {
  materia: string | null
  semana_actual: number | null
  total_semanas: number
  grupos: {
    carga_academica_id: string
    grupos: string
    estatus: EstatusPlaneacion | null
    porcentaje_dosificado: number
    ultima_semana_contenido: number | null
    semanas_atras_del_lider: number | null
  }[]
}

export interface SeguimientoFila {
  planeacion_id: string
  docente: string | null
  materia: string | null
  periodo: string | null
  unidad: number
  nombre_unidad: string
  semana_actual: number
  ultima_semana_contenido: number | null
  atraso_dosificacion_semanas: number
  semana_evaluacion: number | null
  evaluacion_vencida: boolean
  tipo: 'EF' | 'ES'
  recordatorio_enviado: boolean
  desfase_declarado: boolean
  tiene_calificaciones_capturadas: boolean
}

export interface SeguimientoResumenDocente {
  docente_id: string
  docente: string | null
  total_unidades: number
  unidades_con_atraso: number
  porcentaje_cumplimiento: number
}

export interface SeguimientoCargaTrabajo {
  docente: string | null
  semana_evaluacion: number
  materias: string[]
  cantidad: number
}

export interface AcreditacionCarrera {
  carrera: string
  total: number
  liberadas: number
  porcentaje_liberadas: number
}

export interface CalificacionHistorialEntry {
  id: string
  calificacion_id: string
  alumno_id: string
  grupo_id: string
  carga_academica_id: string
  editado_por: string
  parciales_anteriores: { parcial: number; calificacion: number }[] | null
  parciales_nuevos: { parcial: number; calificacion: number }[] | null
  calificacion_final_anterior: number | null
  calificacion_final_nueva: number | null
  promedio_anterior: number | null
  promedio_nuevo: number | null
  created_at: string
  alumno?: { id: string; user?: { name: string } | null; numero_control?: string }
  editor?: { id: string; name: string }
}

export interface SeguimientoPlaneaciones {
  total_atrasos: number
  total_evaluaciones_vencidas: number
  filas: SeguimientoFila[]
  resumen_docentes: SeguimientoResumenDocente[]
  carga_trabajo: SeguimientoCargaTrabajo[]
}

export interface PlaneacionDocente {
  id: string
  carga_academica_id: string
  docente_id: string
  periodo_id: string
  archivo_url: string | null
  archivo_path: string | null
  archivo_nombre: string | null
  estatus: EstatusPlaneacion
  caracterizacion: string | null
  intencion_didactica: string | null
  competencia_asignatura: string | null
  competencias: CompetenciaEspecifica[] | null
  fuentes_informacion: string | null
  apoyos_didacticos: string | null
  calendarizacion: SemanaCalendarizacion[] | null
  fecha_entrega: string | null
  entregada_en?: string | null
  observaciones_revision: string | null
  observaciones_campos: ObservacionCampo[] | null
  revisado_en: string | null
  docente?: { id: string; name: string }
  periodo?: { id: string; nombre: string }
  carga_academica?: CargaAcademica
}

export interface VersionPlaneacion {
  id: string
  motivo: 'autoguardado' | 'envio' | 'antes_de_restaurar' | 'restaurada'
  creado_por: string | null
  created_at: string
  campos_cambiados: string[]
}

export interface Tutoria {
  id: string
  tutor_id: string
  alumno_id: string
  periodo_id: string
  tutor?: { id: string; name: string; email: string }
  alumno?: { id: string; numero_control: string; semestre_actual: number; user?: { name: string }; carrera?: { nombre: string } }
  periodo?: { id: string; nombre: string }
}

export interface FuncionPersonal {
  id: string
  user_id: string
  funcion: string
  area: string | null
  descripcion: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  activa: boolean
  user?: { id: string; name: string; email: string; roles?: { name: string }[] }
}

// ── API ───────────────────────────────────────────────────────────────────────

export const academicoApi = {
  // Materias
  getMaterias: (params?: Record<string, string>) =>
    apiClient.get('/materias', { params }).then(r => r.data.data as Materia[]),
  getMateria: (id: string) =>
    apiClient.get(`/materias/${id}`).then(r => r.data.data as Materia),
  createMateria: (d: Partial<Materia>) => {
    const {
      carrera, carrera_id, clave, nombre, semestre, creditos, horas_teoria, horas_practica,
      tipo, activa, satca, clave_oficial_tecnm, caracterizacion, intencion_didactica,
      competencia_especifica, competencias_previas, temario, actividades_aprendizaje,
      practicas, proyecto_asignatura, evaluacion, fuentes_informacion,
    } = d as Materia
    const payload: Record<string, unknown> = {
      carrera_id: carrera_id ?? (carrera as { id?: string } | undefined)?.id,
      clave, nombre, semestre, creditos, horas_teoria, horas_practica,
      tipo, activa, satca, clave_oficial_tecnm, caracterizacion, intencion_didactica,
      competencia_especifica, competencias_previas, temario, actividades_aprendizaje,
      practicas, proyecto_asignatura, evaluacion, fuentes_informacion,
    }
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])
    return apiClient.post('/materias', payload).then(r => r.data.data as Materia)
  },
  updateMateria: (id: string, d: Partial<Materia>) => {
    // Enviar solo campos que el backend acepta, omitir relaciones y metadatos
    const {
      carrera, carrera_id, clave, nombre, semestre, creditos, horas_teoria, horas_practica,
      tipo, activa, satca, clave_oficial_tecnm, caracterizacion, intencion_didactica,
      competencia_especifica, competencias_previas, temario, actividades_aprendizaje,
      practicas, proyecto_asignatura, evaluacion, fuentes_informacion,
    } = d as Materia
    const payload: Record<string, unknown> = {
      carrera_id: carrera_id ?? (carrera as { id?: string } | undefined)?.id,
      clave, nombre, semestre, creditos, horas_teoria, horas_practica,
      tipo, activa, satca, clave_oficial_tecnm, caracterizacion, intencion_didactica,
      competencia_especifica, competencias_previas, temario, actividades_aprendizaje,
      practicas, proyecto_asignatura, evaluacion, fuentes_informacion,
    }
    // Eliminar undefined para no mandar campos vacíos innecesarios
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])
    return apiClient.patch(`/materias/${id}`, payload).then(r => r.data.data as Materia)
  },
  deleteMateria: (id: string) =>
    apiClient.delete(`/materias/${id}`),
  subirDocumentoMateria: (id: string, file: File) => {
    const fd = new FormData()
    fd.append('documento', file)
    return apiClient.post(`/materias/${id}/documento`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data as { documento_url: string })
  },
  eliminarDocumentoMateria: (id: string) =>
    apiClient.delete(`/materias/${id}/documento`),
  extraerProgramaPdf: (file: File) => {
    const fd = new FormData()
    fd.append('pdf', file)
    return apiClient.post('/materias/extraer-programa', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data as Partial<Materia>)
  },

  // Grupos
  getGrupos: (params?: Record<string, string>) =>
    apiClient.get('/grupos', { params }).then(r => r.data.data as Grupo[]),
  getGrupo: (id: string) =>
    apiClient.get(`/grupos/${id}`).then(r => r.data.data as Grupo),
  createGrupo: (d: Partial<Grupo>) =>
    apiClient.post('/grupos', d).then(r => r.data.data as Grupo),
  updateGrupo: (id: string, d: Partial<Grupo>) =>
    apiClient.patch(`/grupos/${id}`, d).then(r => r.data.data as Grupo),
  deleteGrupo: (id: string) =>
    apiClient.delete(`/grupos/${id}`),
  asignarAlumnos: (grupoId: string, alumnoIds: string[]) =>
    apiClient.post(`/grupos/${grupoId}/alumnos`, { alumno_ids: alumnoIds }).then(r => r.data.data),
  quitarAlumno: (grupoId: string, alumnoId: string) =>
    apiClient.delete(`/grupos/${grupoId}/alumnos/${alumnoId}`),
  liberarGrupoHorarios: (grupoId: string, liberar: boolean) =>
    apiClient.patch(`/grupos/${grupoId}/liberar-horarios`, { liberar }).then(r => r.data.data as Grupo),
  liberarHorariosBulk: (params: { periodo_id?: string; carrera_id?: string; semestre?: number; liberar: boolean }) =>
    apiClient.post('/grupos/liberar-horarios-bulk', params).then(r => r.data),
  aplicarHorariosDiasBulk: (grupoIds: string[], horariosDias: GrupoHorarioDia[]): Promise<{ grupos_afectados: number }> =>
    apiClient.post('/grupos/horarios-dias-bulk', { grupo_ids: grupoIds, horarios_dias: horariosDias }).then(r => r.data.data),

  // Cargas académicas
  getCargas: (params?: Record<string, string>) =>
    apiClient.get('/cargas-academicas', { params }).then(r => r.data.data as CargaAcademica[]),
  createCarga: (d: Partial<CargaAcademica> & { grupo_ids?: string[] }) =>
    apiClient.post('/cargas-academicas', d).then(r => r.data.data as CargaAcademica),
  updateCarga: (id: string, d: Partial<CargaAcademica> & { grupo_ids?: string[] }) =>
    apiClient.patch(`/cargas-academicas/${id}`, d).then(r => r.data.data as CargaAcademica),
  deleteCarga: (id: string) =>
    apiClient.delete(`/cargas-academicas/${id}`),
  getDocentes: (params?: { carrera_id?: string }) =>
    apiClient.get('/admin/docentes', { params }).then(r => r.data.data as { id: string; name: string; email: string; clave_empleado?: string; no_huella?: string; nombramiento?: string; tipo_horas?: string }[]),

  // Tutorías
  getTutorias: (params?: Record<string, string>) =>
    apiClient.get('/tutorias', { params }).then(r => r.data.data as Tutoria[]),
  createTutoria: (d: Partial<Tutoria>) =>
    apiClient.post('/tutorias', d).then(r => r.data.data as Tutoria),
  createTutoriaMasiva: (d: { tutor_id: string; periodo_id: string; alumno_ids: string[] }) =>
    apiClient.post('/tutorias/masivo', d).then(r => r.data.data),
  deleteTutoria: (id: string) =>
    apiClient.delete(`/tutorias/${id}`),

  // Funciones del personal
  getFunciones: (params?: Record<string, string>) =>
    apiClient.get('/funciones-personal', { params }).then(r => r.data.data as FuncionPersonal[]),
  createFuncion: (d: Partial<FuncionPersonal>) =>
    apiClient.post('/funciones-personal', d).then(r => r.data.data as FuncionPersonal),
  updateFuncion: (id: string, d: Partial<FuncionPersonal>) =>
    apiClient.patch(`/funciones-personal/${id}`, d).then(r => r.data.data as FuncionPersonal),
  deleteFuncion: (id: string) =>
    apiClient.delete(`/funciones-personal/${id}`),

  // ── Sprint 3 ─────────────────────────────────────────────────────────────

  // Mallas curriculares
  getMallas: (params?: Record<string, string>) =>
    apiClient.get('/mallas-curriculares', { params }).then(r => r.data.data as MallaCurricular[]),
  createMalla: (d: Partial<MallaCurricular>) =>
    apiClient.post('/mallas-curriculares', d).then(r => r.data.data as MallaCurricular),
  updateMalla: (id: string, d: Partial<MallaCurricular>) =>
    apiClient.patch(`/mallas-curriculares/${id}`, d).then(r => r.data.data as MallaCurricular),
  deleteMalla: (id: string) =>
    apiClient.delete(`/mallas-curriculares/${id}`),

  // Aulas
  getAulas: (params?: Record<string, string>) =>
    apiClient.get('/aulas', { params }).then(r => r.data.data as Aula[]),
  createAula: (d: Partial<Aula>) =>
    apiClient.post('/aulas', d).then(r => r.data.data as Aula),
  updateAula: (id: string, d: Partial<Aula>) =>
    apiClient.patch(`/aulas/${id}`, d).then(r => r.data.data as Aula),
  deleteAula: (id: string) =>
    apiClient.delete(`/aulas/${id}`),
  getAulasDisponibles: (params: { dia_semana: string; hora_inicio: string; hora_fin: string; periodo_id?: string; tipo?: string }) =>
    apiClient.get('/aulas/disponibles', { params }).then(r => r.data.data as Aula[]),
  getOcupacionAulas: (params?: { periodo_id?: string }) =>
    apiClient.get('/aulas/ocupacion', { params }).then(r => r.data.data as OcupacionAula[]),
  getHorarioActualAula: (aulaId: string, params: { periodo_id: string }): Promise<HorarioActualAula> =>
    apiClient.get(`/aulas/${aulaId}/horario-actual`, { params }).then(r => r.data.data),

  // ── Torre de control (estado en vivo del campus) ────────────────────────────────
  getTorreControl: (params: { periodo_id: string }): Promise<TorreControl> =>
    apiClient.get('/torre-control', { params }).then(r => r.data.data),

  // ── Pasaporte QR de cumplimiento del docente ────────────────────────────────────
  getPasaporteDocente: (docenteId: string, params: { periodo_id: string }): Promise<PasaporteDocente> =>
    apiClient.get(`/docentes/${docenteId}/pasaporte`, { params }).then(r => r.data.data),

  // ── Gamificación ─────────────────────────────────────────────────────────────
  getRankingDocentes: (params: { periodo_id: string }): Promise<RankingDocente[]> =>
    apiClient.get('/gamificacion/ranking-docentes', { params }).then(r => r.data.data),

  // ── Aula fantasma y sugerencias de reubicación ──────────────────────────────────
  getAulasFantasma: (params: { periodo_id: string }): Promise<AulaFantasma[]> =>
    apiClient.get('/aulas/fantasma', { params }).then(r => r.data.data),
  getSugerenciasReubicacion: (aulaId: string, params: { periodo_id: string }): Promise<SugerenciaReubicacion[]> =>
    apiClient.get(`/aulas/${aulaId}/sugerencias-reubicacion`, { params }).then(r => r.data.data),

  // ── Índice de salud del semestre ────────────────────────────────────────────────
  getSaludSemestral: (params: { periodo_id: string }): Promise<SaludCarrera[]> =>
    apiClient.get('/salud-semestral', { params }).then(r => r.data.data),

  // ── Modo día de examen ───────────────────────────────────────────────────────────
  getModosExamen: (params?: { periodo_id?: string }): Promise<ModoExamen[]> =>
    apiClient.get('/modos-examen', { params }).then(r => r.data.data),
  activarModoExamen: (data: { periodo_id: string; fecha: string }): Promise<ModoExamen> =>
    apiClient.post('/modos-examen', data).then(r => r.data.data),
  desactivarModoExamen: (id: string) =>
    apiClient.delete(`/modos-examen/${id}`).then(r => r.data),

  // Expediente académico
  getExpedienteAlumno: (alumnoId: string) =>
    apiClient.get(`/alumnos/${alumnoId}/expediente`).then(r => r.data.data as ExpedienteAlumnoResponse),

  // Fichas docentes
  getFichasDocentes: (params?: Record<string, string | boolean | undefined>) =>
    apiClient.get('/docentes/fichas', { params }).then(r => r.data.data as { data: FichaDocente[]; total: number; current_page: number; last_page: number }),
  crearFichaDocente: (d: Partial<FichaDocente>) =>
    apiClient.post('/docentes/fichas', d).then(r => r.data.data as FichaDocente),
  actualizarFichaDocente: (docenteId: string, d: Partial<FichaDocente>) =>
    apiClient.patch(`/docentes/${docenteId}/ficha`, d).then(r => r.data.data as FichaDocente),

  // Sprint 12 — Asistencia y Seguimiento Académico
  getSesionesClase: (params?: Record<string, string>) =>
    apiClient.get('/sesiones-clase', { params }).then(r => r.data.data as { data: SesionClase[]; total: number; current_page: number; last_page: number }),
  crearSesionClase: (d: Omit<Partial<SesionClase>, 'asistencias'> & { asistencias?: Partial<AsistenciaRegistro>[] }) =>
    apiClient.post('/sesiones-clase', d).then(r => r.data.data as SesionClase),
  getSesionClase: (id: string) =>
    apiClient.get(`/sesiones-clase/${id}`).then(r => r.data.data as SesionClase),
  actualizarAsistencia: (sesionId: string, asistencias: Partial<AsistenciaRegistro>[]) =>
    apiClient.patch(`/sesiones-clase/${sesionId}/asistencia`, { asistencias }).then(r => r.data.data as SesionClase),
  getReporteAsistenciaGrupo: (grupoId: string) =>
    apiClient.get(`/grupos/${grupoId}/reporte-asistencia`).then(r => r.data.data as ReporteAsistenciaGrupo),
  enviarResumenSesion: (sesionId: string) =>
    apiClient.post(`/sesiones-clase/${sesionId}/enviar-resumen`).then(r => r.data),
  generarCheckinSesion: (sesionId: string) =>
    apiClient.post(`/sesiones-clase/${sesionId}/generar-checkin`).then(r => r.data.data as SesionClase),
  checkinSesion: (sesionId: string, codigo: string, fotoEvidencia?: string, geo?: { lat: number; lng: number }) =>
    apiClient.post(`/sesiones-clase/${sesionId}/checkin`, {
      codigo, foto_evidencia: fotoEvidencia, geo_lat: geo?.lat, geo_lng: geo?.lng,
    }).then(r => r.data as { message?: string }),
  enviarListaAsistenciaBlanco: (cargaAcademicaId: string) =>
    apiClient.post(`/cargas-academicas/${cargaAcademicaId}/asistencia/enviar-lista-blanco`).then(r => r.data),
  enviarReporteAsistenciaGrupo: (cargaAcademicaId: string) =>
    apiClient.post(`/cargas-academicas/${cargaAcademicaId}/asistencia/enviar-reporte`).then(r => r.data),
  enviarAsistenciaMasivo: (periodoId: string, tipo: 'blanco' | 'reporte') =>
    apiClient.post('/admin/asistencias/enviar-masivo', { periodo_id: periodoId, tipo })
      .then(r => r.data.data as { enviados: number; sin_correo: number }),
  getListaAsistenciaPdf: (cargaAcademicaId: string, tipo: 'blanco' | 'reporte', rango?: { desde?: string; hasta?: string }) =>
    apiClient.get(`/cargas-academicas/${cargaAcademicaId}/asistencia/${tipo === 'blanco' ? 'lista-blanco' : 'reporte'}/pdf`, {
      responseType: 'blob',
      params: tipo === 'reporte' ? rango : undefined,
    }).then(r => new Blob([r.data], { type: 'application/pdf' })),
  getReporteAsistenciaExcel: (cargaAcademicaId: string, rango?: { desde?: string; hasta?: string }) =>
    apiClient.get(`/cargas-academicas/${cargaAcademicaId}/asistencia/reporte/excel`, { responseType: 'blob', params: rango })
      .then(r => new Blob([r.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })),
  getAsistenciaAlumno: (alumnoId: string) =>
    apiClient.get(`/alumnos/${alumnoId}/asistencia`).then(r => r.data.data as AsistenciaRegistro[]),
  getAlertasInasistencia: (params?: Record<string, string | boolean>) =>
    apiClient.get('/alertas/inasistencias', { params }).then(r => r.data.data as { data: AlertaInasistencia[]; total: number; current_page: number; last_page: number }),
  marcarAlertaLeida: (alertaId: string) =>
    apiClient.patch(`/alertas/inasistencias/${alertaId}/leer`).then(r => r.data.data as AlertaInasistencia),
  getReporteCargaAcademica: (params?: { periodo_id?: string }) =>
    apiClient.get('/reportes/carga-academica', { params }).then(r => r.data.data as CargaDocenteItem[]),

  // Horarios
  getHorarios: (params?: Record<string, string>) =>
    apiClient.get('/horarios', { params }).then(r => r.data.data as Horario[]),
  checkHorariosDisponibilidad: (params: { docente_id: string; periodo_id: string; dia_semana: string; hora_inicio: string; hora_fin: string; aula_id?: string; excluir_carga_id?: string }) =>
    apiClient.get('/horarios/disponibilidad', { params }).then(r => r.data.data as { conflictos: { tipo: string; mensaje: string }[]; tiene_conflictos: boolean }),
  verificarConflictos: (params: { carga_academica_id: string; dia_semana: string; hora_inicio: string; hora_fin: string; excluir_horario_id?: string }) =>
    apiClient.get('/horarios/conflictos', { params }).then(r => r.data.data as { conflictos: { tipo: string; mensaje: string }[]; tiene_conflictos: boolean }),
  saveHorarios: (carga_academica_id: string, bloques: { dia_semana: string; hora_inicio: string; hora_fin: string }[]) =>
    apiClient.post('/horarios', { carga_academica_id, bloques }).then(r => r.data.data as Horario[]),
  deleteHorario: (id: string) =>
    apiClient.delete(`/horarios/${id}`),
  updateHorario: (id: string, data: { dia_semana: string; hora_inicio: string; hora_fin: string; aula_id?: string | null }) =>
    apiClient.patch(`/horarios/${id}`, data).then(r => r.data.data as Horario),

  // Admin — Periodos
  getPeriodos: () =>
    apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; activo: boolean; horarios_liberados: boolean }[]),
  liberarHorarios: (periodoId: string, liberar: boolean) =>
    apiClient.patch(`/admin/periodos/${periodoId}/liberar-horarios`, { liberar }).then(r => r.data.data),

  // Alumno — Precarga académica
  getPrecargaAcademica: () =>
    apiClient.get('/alumno/precarga-academica').then(r => r.data.data as {
      liberado: boolean
      semestre: number
      modo?: 'asignado' | 'seleccion'
      periodo: { id: string; nombre: string }
      alumno?: { nombre: string; numero_control: string; carrera: string; semestre: number }
      cargas?: CargaAcademica[]
      cargas_semestre?: CargaAcademica[]
      cargas_pendientes?: CargaAcademica[]
      tiene_pendientes?: boolean
      seleccion_ids?: string[]
    }),
  seleccionarCarga: (cargaAcademicaId: string) =>
    apiClient.post('/alumno/precarga-academica/selecciones', { carga_academica_id: cargaAcademicaId }).then(r => r.data),
  deseleccionarCarga: (cargaAcademicaId: string) =>
    apiClient.delete(`/alumno/precarga-academica/selecciones/${cargaAcademicaId}`).then(r => r.data),
  downloadPrecargaPdf: () =>
    apiClient.get('/alumno/precarga-academica/pdf', { responseType: 'blob' }).then(r => r.data as Blob),

  // Planeaciones didácticas
  getPlaneaciones: (params?: Record<string, string>) =>
    apiClient.get('/planeaciones-docentes', { params }).then(r => r.data.data),
  getMisPlaneaciones: (params?: Record<string, string>) =>
    apiClient.get('/planeaciones-docentes/mias', { params }).then(r => r.data.data as PlaneacionDocente[]),
  getSeguimientoPlaneaciones: (params?: { periodo_id?: string }) =>
    apiClient.get('/planeaciones-docentes/seguimiento', { params }).then(r => r.data.data as SeguimientoPlaneaciones),
  descargarSeguimientoPdf: (params?: { periodo_id?: string }) =>
    apiClient.get('/planeaciones-docentes/seguimiento/pdf', { params, responseType: 'blob' }).then(r => {
      const blob = new Blob([r.data], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = 'seguimiento_instrumentacion.pdf'
      a.click()
      URL.revokeObjectURL(url)
    }),
  getAcreditacionPorCarrera: (params?: { periodo_id?: string }) =>
    apiClient.get('/planeaciones-docentes/acreditacion-por-carrera', { params }).then(r => r.data.data as AcreditacionCarrera[]),
  getMiComparativoInstrumentacion: (params?: { periodo_id?: string }) =>
    apiClient.get('/planeaciones-docentes/mi-comparativo', { params }).then(r => r.data.data as {
      mi_porcentaje: number | null
      promedio_academia: number | null
      total_docentes_academia: number
    }),
  getPlaneacion: (id: string) =>
    apiClient.get(`/planeaciones-docentes/${id}`).then(r => r.data.data as PlaneacionDocente),
  savePlaneacion: (d: Partial<PlaneacionDocente>, archivo?: File | null) => {
    const fd = new FormData()
    for (const [k, v] of Object.entries(d)) {
      if (v === undefined || v === null || v === '') continue
      fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
    }
    if (archivo) fd.append('archivo', archivo)
    return apiClient.post('/planeaciones-docentes', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data as PlaneacionDocente)
  },
  descargarArchivoLegacyPlaneacion: (id: string, nombreSugerido: string) =>
    apiClient.get(`/planeaciones-docentes/${id}/archivo`, { responseType: 'blob' }).then(r => {
      const blob = new Blob([r.data])
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = nombreSugerido
      a.click()
      URL.revokeObjectURL(url)
    }),
  clonarPlaneacion: (id: string, destino: { carga_academica_id: string; periodo_id: string }) =>
    apiClient.post(`/planeaciones-docentes/${id}/clonar`, destino).then(r => r.data.data as PlaneacionDocente),
  descargarPdfCalendarioPlaneacion: (id: string, nombreSugerido: string) =>
    apiClient.get(`/planeaciones-docentes/${id}/pdf-calendario`, { responseType: 'blob' }).then(r => {
      const blob = new Blob([r.data], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = nombreSugerido
      a.click()
      URL.revokeObjectURL(url)
    }),
  descargarPdfInstrumentacionPlaneacion: (id: string, nombreSugerido: string, params?: { fecha_elaboracion?: string; docente_nombre?: string; jefe_nombre?: string }) =>
    apiClient.get(`/planeaciones-docentes/${id}/pdf-instrumentacion`, { responseType: 'blob', params }).then(r => {
      const blob = new Blob([r.data], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = nombreSugerido
      a.click()
      URL.revokeObjectURL(url)
    }),
  descargarDocxInstrumentacionPlaneacion: (id: string, nombreSugerido: string) =>
    apiClient.get(`/planeaciones-docentes/${id}/docx-instrumentacion`, { responseType: 'blob' }).then(r => {
      const blob = new Blob([r.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = nombreSugerido
      a.click()
      URL.revokeObjectURL(url)
    }),
  enviarPlaneacion: (id: string) =>
    apiClient.post(`/planeaciones-docentes/${id}/enviar`, {}).then(r => r.data.data as PlaneacionDocente),
  versionesPlaneacion: (id: string) =>
    apiClient.get(`/planeaciones-docentes/${id}/versiones`).then(r => r.data.data as VersionPlaneacion[]),
  restaurarVersionPlaneacion: (id: string, versionId: string) =>
    apiClient.post(`/planeaciones-docentes/${id}/versiones/${versionId}/restaurar`, {}).then(r => r.data.data as PlaneacionDocente),
  comentariosPlaneacion: (id: string) =>
    apiClient.get(`/planeaciones-docentes/${id}/comentarios`).then(r => r.data.data as ComentarioPlaneacion[]),
  agregarComentarioPlaneacion: (id: string, d: { seccion: SeccionObservacion; unidad?: number | null; categoria?: string | null; mensaje: string }) =>
    apiClient.post(`/planeaciones-docentes/${id}/comentarios`, d).then(r => r.data.data as ComentarioPlaneacion),
  resolverComentariosPlaneacion: (id: string, d: { seccion: SeccionObservacion; unidad?: number | null; categoria?: string | null; resuelto: boolean }) =>
    apiClient.patch(`/planeaciones-docentes/${id}/comentarios/resolver`, d).then(r => r.data),
  compararGruposPlaneacion: (cargaAcademicaId: string) =>
    apiClient.get(`/planeaciones-docentes/comparar-grupos`, { params: { carga_academica_id: cargaAcademicaId } }).then(r => r.data.data as ComparativaGrupos),
  buscarPlaneaciones: (q: string) =>
    apiClient.get(`/planeaciones-docentes/buscar`, { params: { q } }).then(r => r.data.data as ResultadoBusquedaPlaneacion[]),
  mejorarTextoIa: (texto: string, tipo: 'indicador' | 'actividad' | 'actividad_aprendizaje' | 'evidencia' | 'general' | 'sugerir_ensenanza' | 'sugerir_evidencia' | 'sugerir_instrumento' | 'generar_instrumento', contexto?: string, planeacionId?: string) =>
    apiClient.post(`/ia/mejorar-texto`, { texto, tipo, contexto, planeacion_id: planeacionId }).then(r => r.data.data as { sugerencia: string; fuente?: 'ollama' | 'fallback' }),
  archivosPlaneacion: (id: string) =>
    apiClient.get(`/planeaciones-docentes/${id}/archivos`).then(r => r.data.data as ArchivoPlaneacion[]),
  subirArchivoPlaneacion: (id: string, archivo: File, unidad?: number | null) => {
    const fd = new FormData()
    fd.append('archivo', archivo)
    if (unidad != null) fd.append('unidad', String(unidad))
    return apiClient.post(`/planeaciones-docentes/${id}/archivos`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data as ArchivoPlaneacion)
  },
  eliminarArchivoPlaneacion: (id: string, archivoId: string) =>
    apiClient.delete(`/planeaciones-docentes/${id}/archivos/${archivoId}`).then(r => r.data),
  descargarArchivoPlaneacion: (id: string, archivoId: string, nombreSugerido: string) =>
    apiClient.get(`/planeaciones-docentes/${id}/archivos/${archivoId}/descargar`, { responseType: 'blob' }).then(r => {
      const blob = new Blob([r.data])
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = nombreSugerido
      a.click()
      URL.revokeObjectURL(url)
    }),
  cambiarEstatusPlaneacion: (id: string, estatus: string, observaciones?: string, observacionesCampos?: ObservacionCampo[]) =>
    apiClient.patch(`/planeaciones-docentes/${id}/estatus`, {
      estatus,
      observaciones_revision: observaciones,
      observaciones_campos: observacionesCampos?.length ? observacionesCampos : undefined,
    }).then(r => r.data.data as PlaneacionDocente),
  // Avance real de dosificación al corte — solo Desarrollo Académico/admin/superadmin
  // (el docente ya no puede editar semana_realizado desde su editor).
  actualizarDosificacionPlaneacion: (id: string, avances: { unidad: number; index: number; semana_realizado: number | null }[]) =>
    apiClient.patch(`/planeaciones-docentes/${id}/dosificacion`, { avances }).then(r => r.data.data as PlaneacionDocente),

  // ── Sprint 4 — Calificaciones ─────────────────────────────────────────────

  getCalificacionesGrupo: (grupoId: string): Promise<Calificacion[]> =>
    apiClient.get(`/grupos/${grupoId}/calificaciones`).then(r => r.data.data),

  getHistorialCalificaciones: (
    grupoId: string,
    filtros?: { carga_academica_id?: string | null; editado_por?: string; desde?: string; hasta?: string }
  ): Promise<CalificacionHistorialEntry[]> =>
    apiClient.get(`/grupos/${grupoId}/calificaciones/historial`, {
      params: filtros ? { ...filtros, carga_academica_id: filtros.carga_academica_id ?? undefined } : undefined,
    }).then(r => r.data.data),

  exportarCalificacionesCsv: (grupoId: string, cargaAcademicaId: string, nombreSugerido: string) =>
    apiClient.get(`/grupos/${grupoId}/calificaciones/exportar`, {
      params: { carga_academica_id: cargaAcademicaId },
      responseType: 'blob',
    }).then(r => {
      const blob = new Blob([r.data], { type: 'text/csv;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = nombreSugerido
      a.click()
      URL.revokeObjectURL(url)
    }),

  descargarActaCalificaciones: (grupoId: string, cargaAcademicaId: string, nombreSugerido: string) =>
    apiClient.get(`/grupos/${grupoId}/calificaciones/acta-pdf`, {
      params: { carga_academica_id: cargaAcademicaId },
      responseType: 'blob',
    }).then(r => {
      const blob = new Blob([r.data], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = nombreSugerido
      a.click()
      URL.revokeObjectURL(url)
    }).catch(async e => { throw await errorDeBlob(e) }),

  descargarActaCalificacionesExcel: (grupoId: string, cargaAcademicaId: string, nombreSugerido: string) =>
    apiClient.get(`/grupos/${grupoId}/calificaciones/acta-excel`, {
      params: { carga_academica_id: cargaAcademicaId },
      responseType: 'blob',
    }).then(r => {
      const blob = new Blob([r.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = nombreSugerido
      a.click()
      URL.revokeObjectURL(url)
    }).catch(async e => { throw await errorDeBlob(e) }),

  obtenerEstadoActaCalificaciones: (grupoId: string, cargaAcademicaId: string): Promise<EstadoActaCaptura> =>
    apiClient.get(`/grupos/${grupoId}/calificaciones/acta-estado`, {
      params: { carga_academica_id: cargaAcademicaId },
    }).then(r => r.data.data),

  firmarActaCalificacionesCaptura: (grupoId: string, cargaAcademicaId: string): Promise<ActaCalificacionesCaptura> =>
    apiClient.patch(`/grupos/${grupoId}/calificaciones/acta-pdf/firmar`, { carga_academica_id: cargaAcademicaId }).then(r => r.data.data),

  importarCalificacionesCsv: (grupoId: string, cargaAcademicaId: string, archivo: File): Promise<{ actualizados: number; errores: string[] }> => {
    const fd = new FormData()
    fd.append('carga_academica_id', cargaAcademicaId)
    fd.append('archivo', archivo)
    return apiClient.post(`/grupos/${grupoId}/calificaciones/importar`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data)
  },

  registrarCalificacion: (data: {
    alumno_id: string
    grupo_id: string
    carga_academica_id: string
    parciales?: { parcial: number; calificacion: number }[]
    calificacion_final?: number
    oportunidad?: 'primera_oportunidad' | 'segunda_oportunidad'
  }): Promise<Calificacion> =>
    apiClient.post('/calificaciones', data).then(r => r.data.data),

  getSituacionAcademica: (alumnoId: string): Promise<SituacionAcademica> =>
    apiClient.get(`/alumnos/${alumnoId}/situacion-academica`).then(r => r.data.data),

  getConfigEvaluacion: (carreraId: string): Promise<ConfiguracionEvaluacion | null> =>
    apiClient.get(`/configuraciones-evaluacion/${carreraId}`).then(r => r.data.data).catch(() => null),

  saveConfigEvaluacion: (data: {
    carrera_id: string
    peso_parciales: { parcial: number; peso: number }[]
    calificacion_minima: number
  }): Promise<ConfiguracionEvaluacion> =>
    apiClient.post('/configuraciones-evaluacion', data).then(r => r.data.data),

  cerrarCurso: (grupoId: string, periodoId: string): Promise<void> =>
    apiClient.post('/cierres-de-curso', { grupo_id: grupoId, periodo_id: periodoId }).then(() => undefined),

  reabrirCurso: (grupoId: string, periodoId: string, motivo: string): Promise<void> =>
    apiClient.post(`/grupos/${grupoId}/cierre-de-curso/reabrir`, { periodo_id: periodoId, motivo }).then(() => undefined),

  firmarActa: (grupoId: string, cargaAcademicaId?: string): Promise<ActaCalificaciones> =>
    apiClient.patch(`/grupos/${grupoId}/acta-calificaciones/firmar`, { carga_academica_id: cargaAcademicaId }).then(r => r.data.data),

  getAlertas: (params?: { revisada?: boolean; carrera_id?: string }): Promise<{ data: AlertaBajaDefinitiva[]; meta: unknown }> =>
    apiClient.get('/alertas-baja-definitiva', { params: {
      ...(params?.revisada !== undefined && { revisada: params.revisada ? 1 : 0 }),
      ...(params?.carrera_id && { carrera_id: params.carrera_id }),
    }}).then(r => r.data.data),

  revisarAlerta: (id: string): Promise<AlertaBajaDefinitiva> =>
    apiClient.patch(`/alertas-baja-definitiva/${id}/revisar`, {}).then(r => r.data.data),

  // ── Cortes de captura de calificaciones ───────────────────────────────────

  getCortesCaptura: (periodoId: string): Promise<CorteCaptura[]> =>
    apiClient.get(`/admin/periodos/${periodoId}/cortes-captura`).then(r => r.data.data),

  guardarCorteCaptura: (periodoId: string, data: {
    numero: 1 | 2 | 3
    nombre?: string
    fecha_corte: string
    fecha_limite_captura: string
  }): Promise<CorteCaptura> =>
    apiClient.post(`/admin/periodos/${periodoId}/cortes-captura`, data).then(r => r.data.data),

  actualizarCorteCaptura: (corteId: string, data: {
    nombre?: string
    fecha_corte: string
    fecha_limite_captura: string
  }): Promise<CorteCaptura> =>
    apiClient.patch(`/admin/cortes-captura/${corteId}`, data).then(r => r.data.data),

  evaluarCorteCaptura: (corteId: string): Promise<ResumenCumplimientoCorte> =>
    apiClient.post(`/cortes-captura/${corteId}/evaluar`, {}).then(r => r.data.data),

  getCumplimientoCorte: (corteId: string): Promise<AlertaCorteCaptura[]> =>
    apiClient.get(`/cortes-captura/${corteId}/cumplimiento`).then(r => r.data.data),

  getAlertasCorteCaptura: (params?: { periodo_id?: string; pendiente?: boolean }): Promise<{ data: AlertaCorteCaptura[]; meta: unknown }> =>
    apiClient.get('/alertas-corte-captura', { params: {
      ...(params?.periodo_id && { periodo_id: params.periodo_id }),
      ...(params?.pendiente !== undefined && { pendiente: params.pendiente ? 1 : 0 }),
    }}).then(r => r.data.data),

  marcarLeidaAlertaCorteCaptura: (id: string): Promise<AlertaCorteCaptura> =>
    apiClient.patch(`/alertas-corte-captura/${id}/marcar-leida`, {}).then(r => r.data.data),

  // ── Bitácora de prefectura (incidencias de clase) ──────────────────────────────
  getIncidenciasClase: (params?: {
    periodo_id?: string; carrera_id?: string; semestre?: string | number; grupo_id?: string
    docente_id?: string; estatus?: string; fecha_desde?: string; fecha_hasta?: string
  }): Promise<IncidenciaClase[]> =>
    apiClient.get('/incidencias-clase', { params }).then(r => r.data.data),

  crearIncidenciaClase: (data: {
    periodo_id: string; grupo_id: string; carga_academica_id?: string | null; docente_id?: string | null
    aula_id?: string | null; fecha: string; hora_revision: string; dia_semana?: string
    estatus: EstatusIncidenciaClase; docente_presente?: boolean; coincide_horario?: boolean
    alumnos_presentes?: number; observaciones?: string
  }): Promise<IncidenciaClase> =>
    apiClient.post('/incidencias-clase', data).then(r => r.data.data),

  getHorarioEsperadoClase: (params: { grupo_id: string; periodo_id: string; dia_semana: string; hora: string }): Promise<CargaAcademica | null> =>
    apiClient.get('/incidencias-clase/horario-esperado', { params }).then(r => r.data.data),

  // ── Alerta temprana de riesgo académico ─────────────────────────────────────────
  getAlertasRiesgoAcademico: (params: { periodo_id: string; carrera_id?: string; grupo_id?: string; nivel?: NivelRiesgo }): Promise<AlumnoRiesgo[]> =>
    apiClient.get('/alertas-riesgo-academico', { params }).then(r => r.data.data),

  // ── Alerta de deserción temprana (patrón de asistencia de arranque) ────────────
  getAlertasDesercionTemprana: (params: { periodo_id: string; carrera_id?: string; grupo_id?: string; semanas?: number; nivel?: NivelRiesgo }): Promise<AlumnoDesercionTemprana[]> =>
    apiClient.get('/alertas-desercion-temprana', { params }).then(r => r.data.data),

  // ── Bitácora de mantenimiento de aulas ──────────────────────────────────────────
  getTicketsMantenimiento: (params?: { estatus?: EstatusTicketMantenimiento; aula_id?: string }): Promise<TicketMantenimiento[]> =>
    apiClient.get('/tickets-mantenimiento', { params }).then(r => r.data.data),

  actualizarTicketMantenimiento: (id: string, data: { estatus: EstatusTicketMantenimiento; notas_resolucion?: string }): Promise<TicketMantenimiento> =>
    apiClient.patch(`/tickets-mantenimiento/${id}`, data).then(r => r.data.data),

  // ── Builder de Horarios ──────────────────────────────────────────────────────
  getDisponibilidadDocente: (params: { docente_id: string; periodo_id: string }): Promise<{ bloques: DisponibilidadBloque[]; dias_no_laborables: DiaNoLaborable[] }> =>
    apiClient.get('/disponibilidad-docente', { params }).then(r => r.data.data),

  saveDisponibilidadDocente: (data: { docente_id: string; periodo_id: string; bloques: Omit<DisponibilidadBloque, 'id'>[] }): Promise<DisponibilidadBloque[]> =>
    apiClient.put('/disponibilidad-docente', data).then(r => r.data.data),

  getBuilderGrid: (params: { periodo_id: string; docente_id?: string; grupo_id?: string; carrera_id?: string }): Promise<{ dias: BuilderDia[] }> =>
    apiClient.get('/horarios/builder-grid', { params }).then(r => r.data.data),

  verificarDisponibilidad: (data: {
    periodo_id: string; docente_id: string; dia_semana: string
    hora_inicio: string; hora_fin: string
    aula_id?: string; grupo_ids?: string[]; materia_id?: string; ignorar_carga_id?: string
  }): Promise<{ resultado: VerificacionResultado; horas: Record<string, ResumenHoras> | null }> =>
    apiClient.post('/horarios/verificar-disponibilidad', data).then(r => r.data.data),

  asignarHorario: (data: {
    periodo_id: string; docente_id: string; materia_id: string; grupo_ids: string[]
    aula_id?: string; dia_semana: string; hora_inicio: string; hora_fin: string
  }): Promise<{ carga: CargaAcademica; horario: Horario; horas: Record<string, ResumenHoras> | null }> =>
    apiClient.post('/horarios/asignar', data).then(r => r.data.data),

  actualizarGruposHorario: (horarioId: string, grupoIds: string[]): Promise<CargaAcademica> =>
    apiClient.patch(`/horarios/${horarioId}/grupos`, { grupo_ids: grupoIds }).then(r => r.data.data),

  getDiagnosticoHorario: (periodoId: string): Promise<{ empalmes: { tipo: string; mensaje: string; horario_a: string; horario_b: string }[]; total: number }> =>
    apiClient.get('/horarios/diagnostico', { params: { periodo_id: periodoId } }).then(r => r.data.data),

  buscarDisponibilidad: (data: {
    periodo_id: string; materia_id: string; grupo_ids: string[]
    carrera_id?: string; docente_id?: string; dia_semana?: string
  }): Promise<{ propuestas: { dia_semana: string; hora_inicio: string; hora_fin: string; docente_id: string; docente_nombre: string; aula_id: string | null; aula_nombre: string | null }[] }> =>
    apiClient.post('/horarios/disponibilidad/buscar', data).then(r => r.data.data),

  confirmarCarga: (cargaId: string): Promise<CargaAcademica> =>
    apiClient.patch(`/cargas-academicas/${cargaId}/confirmar`, {}).then(r => r.data.data),

  reportarConflictoCarga: (cargaId: string, comentario: string): Promise<CargaAcademica> =>
    apiClient.patch(`/cargas-academicas/${cargaId}/reportar-conflicto`, { comentario }).then(r => r.data.data),

  getDiasNoLaborables: (year?: number): Promise<DiaNoLaborable[]> =>
    apiClient.get('/dias-no-laborables', { params: year ? { year } : {} }).then(r => r.data.data),

  addDiaNoLaborable: (data: { fecha: string; descripcion: string }): Promise<DiaNoLaborable> =>
    apiClient.post('/dias-no-laborables', data).then(r => r.data.data),

  deleteDiaNoLaborable: (id: string): Promise<void> =>
    apiClient.delete(`/dias-no-laborables/${id}`).then(() => undefined),

  getConcentradoUrl: (params: { periodo_id: string; carrera_id?: string; turno?: string }): string => {
    const qs = new URLSearchParams({
      periodo_id: params.periodo_id,
      ...(params.carrera_id ? { carrera_id: params.carrera_id } : {}),
      ...(params.turno ? { turno: params.turno } : {}),
    })
    return `/api/horarios/concentrado?${qs}`
  },

  // Horario de Trabajo Docente (TecNM-AC-PO-003-01)
  getHorariosTrabajo: (params?: { periodo_id?: string; docente_id?: string }): Promise<any> =>
    apiClient.get('/horarios-trabajo', { params }).then(r => r.data.data),

  getMiHorarioTrabajo: (periodo_id?: string): Promise<HorarioTrabajo | null> =>
    apiClient.get('/horarios-trabajo/mio', { params: periodo_id ? { periodo_id } : {} }).then(r => r.data.data),

  guardarHorarioTrabajo: (data: {
    periodo_id: string
    total_horas_semanales?: number
    cct_docente?: string
    tipo_nombramiento?: string
    fecha_ingreso_sep?: string
    carga_academica_json?: Record<string, unknown>[]
    apoyo_docencia_json?: Record<string, unknown>[]
    actividades_admin_json?: Record<string, unknown>[]
    url_pdf?: string
  }): Promise<HorarioTrabajo> =>
    apiClient.post('/horarios-trabajo', data).then(r => r.data.data),

  // Sprint 13 — Egresados
  getEgresados: (params?: { carrera_id?: string; titulado?: boolean; anio?: number; page?: number }): Promise<{ data: Egresado[]; total: number; current_page: number; last_page: number }> =>
    apiClient.get('/egresados', { params }).then(r => r.data.data),

  registrarEgresado: (data: { alumno_id: string; anio_egreso: number; titulado?: boolean; sector?: string; empresa_actual?: string; puesto_actual?: string; correo_actualizado?: string }): Promise<Egresado> =>
    apiClient.post('/egresados', data).then(r => r.data.data),

  actualizarEgresado: (id: string, data: Partial<Egresado>): Promise<Egresado> =>
    apiClient.patch(`/egresados/${id}`, data).then(r => r.data.data),

  // Sprint 13 — Reportes PDF
  descargarReporteMatricula: (params?: { periodo_id?: string }): Promise<Blob> =>
    apiClient.get('/reportes/matricula/pdf', { params, responseType: 'blob' }).then(r => r.data),

  descargarReporteCalificaciones: (params?: { carrera_id?: string; periodo_id?: string }): Promise<Blob> =>
    apiClient.get('/reportes/calificaciones/pdf', { params, responseType: 'blob' }).then(r => r.data),

  descargarDirectorio: (tipo: 'alumnos' | 'docentes' | 'egresados'): Promise<Blob> =>
    apiClient.get(`/reportes/directorio/${tipo}/pdf`, { responseType: 'blob' }).then(r => r.data),

  descargarReporteAcreditacion: (params: { periodo_id: string; generacion?: number }): Promise<Blob> =>
    apiClient.get('/reportes/acreditacion/pdf', { params, responseType: 'blob' }).then(r => r.data),

  // Estadísticas de calificaciones — KPIs de rendimiento académico y deserción
  getIndicadorPromedio: (params?: { carrera_id?: string; periodo_id?: string }): Promise<IndicadorPromedioCarrera[]> =>
    apiClient.get('/indicadores/promedio', { params }).then(r => r.data.data),

  getIndicadorReprobacion: (params?: { carrera_id?: string; periodo_id?: string }): Promise<{ por_carrera: IndicadorReprobacionCarrera[]; por_grupo: IndicadorReprobacionGrupo[] }> =>
    apiClient.get('/indicadores/reprobacion', { params }).then(r => r.data.data),

  getIndicadorDesercion: (params?: { carrera_id?: string; periodo_id?: string }): Promise<IndicadorDesercion[]> =>
    apiClient.get('/indicadores/desercion', { params }).then(r => r.data.data),

  // Sprint 13 — Dashboard Asistencia Institucional
  getDashboardAsistencia: (params?: { periodo_id?: string }): Promise<DashboardAsistencia> =>
    apiClient.get('/indicadores/asistencia', { params }).then(r => r.data.data),

  getAsistenciaPorCarrera: (carreraId: string, params?: { periodo_id?: string }): Promise<any> =>
    apiClient.get(`/indicadores/asistencia/carrera/${carreraId}`, { params }).then(r => r.data.data),

  // Sprint 14 — PIT: Asignaciones tutor-tutorado
  getAsignacionesTutoria: (params?: { periodo_id?: string; tutor_id?: string; page?: number }): Promise<{ data: AsignacionTutoria[]; total: number; current_page: number; last_page: number }> =>
    apiClient.get('/asignaciones-tutoria', { params }).then(r => r.data.data),

  crearAsignacionTutoria: (data: { tutor_id: string; alumno_id: string; periodo_id: string }): Promise<AsignacionTutoria> =>
    apiClient.post('/asignaciones-tutoria', data).then(r => r.data.data),

  actualizarAsignacionTutoria: (id: string, activa: boolean): Promise<AsignacionTutoria> =>
    apiClient.patch(`/asignaciones-tutoria/${id}`, { activa }).then(r => r.data.data),

  // Sprint 14 — PIT: Sesiones de tutoría
  getSesionesTutoria: (params?: { tutor_id?: string; page?: number }): Promise<{ data: SesionTutoria[]; total: number; current_page: number; last_page: number }> =>
    apiClient.get('/sesiones-tutoria', { params }).then(r => r.data.data),

  getSesionesPorTutor: (tutorId: string): Promise<{ tutor: Tutor; sesiones: SesionTutoria[]; total: number }> =>
    apiClient.get(`/sesiones-tutoria/${tutorId}`).then(r => r.data.data),

  registrarSesionTutoria: (data: { tipo: 'individual' | 'grupal'; fecha: string; duracion_minutos?: number; temas_tratados: string; observaciones?: string; alumnos_atendidos_ids: string[]; tutor_id?: string }): Promise<SesionTutoria> =>
    apiClient.post('/sesiones-tutoria', data).then(r => r.data.data),

  // Sprint 14 — PIT: Plan de Acción Tutorial
  getPlanesAccionTutorial: (params?: { tutor_id?: string; periodo_id?: string; page?: number }): Promise<{ data: PlanAccionTutorial[]; total: number; current_page: number; last_page: number }> =>
    apiClient.get('/planes-accion-tutorial', { params }).then(r => r.data.data),

  crearPlanAccionTutorial: (data: { periodo_id: string; objetivo_general: string; actividades?: Record<string, unknown>[]; metas?: Record<string, unknown>[]; tutor_id?: string }): Promise<PlanAccionTutorial> =>
    apiClient.post('/planes-accion-tutorial', data).then(r => r.data.data),

  actualizarEstatusPat: (id: string, estatus: 'borrador' | 'enviado' | 'aprobado'): Promise<PlanAccionTutorial> =>
    apiClient.patch(`/planes-accion-tutorial/${id}/estatus`, { estatus }).then(r => r.data.data),

  // Sprint 14 — PIT: Dashboard indicadores
  getDashboardTutoria: (params?: { periodo_id?: string }): Promise<DashboardTutoria> =>
    apiClient.get('/indicadores/tutoria', { params }).then(r => r.data.data),

  // Sprint 15 — Traslados
  getTraslados: (params?: { tipo?: 'entrada' | 'salida'; estatus?: string; page?: number }): Promise<{ data: Traslado[]; total: number; current_page: number; last_page: number }> =>
    apiClient.get('/traslados', { params }).then(r => r.data.data),

  solicitarTraslado: (data: { tipo: 'entrada' | 'salida'; instituto_origen?: string; instituto_destino?: string; fecha_solicitud: string; alumno_id?: string }): Promise<Traslado> =>
    apiClient.post('/traslados', data).then(r => r.data.data),

  gestionarTraslado: (id: string, estatus: 'aceptado' | 'rechazado', motivo_rechazo?: string): Promise<Traslado> =>
    apiClient.patch(`/traslados/${id}/gestionar`, { estatus, motivo_rechazo }).then(r => r.data.data),

  kardexTrasladoPdfUrl: (id: string): string =>
    `/api/traslados/${id}/kardex/pdf`,

  // Sprint 15 — Convalidaciones
  getConvalidaciones: (params?: { alumno_id?: string; page?: number }): Promise<{ data: Convalidacion[]; total: number; current_page: number; last_page: number }> =>
    apiClient.get('/convalidaciones', { params }).then(r => r.data.data),

  registrarConvalidacion: (data: { alumno_id: string; materia_origen_nombre: string; materia_origen_clave: string; calificacion_obtenida: number; institucion_origen: string; materia_equivalente_id?: string; dictamen_url?: string }): Promise<Convalidacion> =>
    apiClient.post('/convalidaciones', data).then(r => r.data.data),

  // Sprint 15 — Equivalencias
  getEquivalencias: (params?: { alumno_id?: string; page?: number }): Promise<{ data: Equivalencia[]; total: number; current_page: number; last_page: number }> =>
    apiClient.get('/equivalencias', { params }).then(r => r.data.data),

  registrarEquivalencia: (data: { alumno_id: string; institucion_origen: string; materias_json: MateriasEquivalencia[]; dictamen_url?: string }): Promise<Equivalencia> =>
    apiClient.post('/equivalencias', data).then(r => r.data.data),

  // Sprint 15 — Historial académico completo
  getHistorialAcademico: (alumnoId: string): Promise<{ alumno: unknown; convalidaciones: Convalidacion[]; equivalencias: Equivalencia[] }> =>
    apiClient.get(`/alumnos/${alumnoId}/historial-academico`).then(r => r.data.data),

  // ── Sprint 16 — Movilidad Estudiantil y Cursos de Verano ────────────────────

  getConveniosMovilidad: (params?: { activo?: boolean }): Promise<{ data: ConvenioMovilidad[] }> =>
    apiClient.get('/convenios-movilidad', { params }).then(r => r.data),

  crearConvenioMovilidad: (data: {
    nombre_institucion: string
    tipo: 'tecnm' | 'nacional' | 'extranjera'
    vigente_desde: string
    vigente_hasta?: string
    url_convenio?: string
  }): Promise<ConvenioMovilidad> =>
    apiClient.post('/convenios-movilidad', data).then(r => r.data.data),

  getMovilidadEstudiantil: (params?: { estatus?: string; page?: number }): Promise<{ data: MovilidadEstudiantil[]; total: number; current_page: number; last_page: number }> =>
    apiClient.get('/movilidad-estudiantil', { params }).then(r => r.data.data),

  solicitarMovilidad: (data: {
    ies_receptora: string
    fecha_inicio: string
    convenio_id?: string
    alumno_id?: string
    fecha_fin?: string
  }): Promise<MovilidadEstudiantil> =>
    apiClient.post('/movilidad-estudiantil', data).then(r => r.data.data),

  registrarCalificacionesMovilidad: (
    movilidadId: string,
    materias: { nombre: string; calificacion?: number; tipo_acreditacion: 'numerica' | 'AC' | 'NA' }[]
  ): Promise<MovilidadEstudiantil> =>
    apiClient.patch(`/movilidad-estudiantil/${movilidadId}/calificaciones`, { materias_cursadas: materias }).then(r => r.data.data),

  getCursosVerano: (params?: { estatus?: string; periodo_id?: string; page?: number }): Promise<{ data: CursoVerano[]; total: number; current_page: number; last_page: number }> =>
    apiClient.get('/cursos-verano', { params }).then(r => r.data.data),

  programarCursoVerano: (data: {
    periodo_padre_id: string
    materia_id: string
    docente_id: string
    fecha_inicio: string
    aula_id?: string
    fecha_fin?: string
    max_alumnos?: number
    min_alumnos?: number
  }): Promise<CursoVerano> =>
    apiClient.post('/cursos-verano', data).then(r => r.data.data),

  inscribirCursoVerano: (cursoVeranoId: string, alumnoId?: string): Promise<InscripcionVerano> =>
    apiClient.post(`/cursos-verano/${cursoVeranoId}/inscripciones`, alumnoId ? { alumno_id: alumnoId } : {}).then(r => r.data.data),

  cerrarCursoVerano: (
    cursoVeranoId: string,
    calificaciones?: { alumno_id: string; calificacion?: number; acreditado?: boolean }[]
  ): Promise<CursoVerano> =>
    apiClient.patch(`/cursos-verano/${cursoVeranoId}/cerrar`, { calificaciones }).then(r => r.data.data),

  // ── Sprint 17 — Educación a Distancia (TecNM Cap. 16) ───────────────────────
  // (types defined above the const block)

  // ── Sprint 19 — Permisos Sindicales y Escalafón ─────────────────────────────

  getPermisosSindicales: (params?: { docente_id?: string; tipo_permiso?: string; periodo_id?: string; page?: number }): Promise<{ data: PermisoSindical[]; total: number; current_page: number; last_page: number }> =>
    apiClient.get('/permisos-sindicales', { params }).then(r => r.data.data),

  registrarPermisoSindical: (data: {
    docente_id: string
    tipo_permiso: 'comision_sindical' | 'licencia_con_goce' | 'licencia_sin_goce'
    fecha_inicio: string
    fecha_fin: string
    motivo: string
    periodo_id?: string
  }): Promise<PermisoSindical> =>
    apiClient.post('/permisos-sindicales', data).then(r => r.data.data),

  oficioPdfUrl: (permisoId: string): string =>
    `/api/permisos-sindicales/${permisoId}/oficio-pdf`,

  getConcursosOposicion: (params?: { page?: number }): Promise<{ data: ConcursoOposicion[]; total: number; current_page: number; last_page: number }> =>
    apiClient.get('/concursos-oposicion', { params }).then(r => r.data.data),

  registrarConcursoOposicion: (data: {
    nombre: string
    fecha_realizacion: string
    descripcion?: string
    participantes?: { docente_id: string; puntaje_obtenido?: number; resultado?: string; categoria_nueva?: string }[]
  }): Promise<ConcursoOposicion> =>
    apiClient.post('/concursos-oposicion', data).then(r => r.data.data),

  getDashboardAusentismo: (params?: { periodo_id?: string }): Promise<AusentismoDashboard> =>
    apiClient.get('/dashboard/ausentismo-sindical', { params }).then(r => r.data.data),

  getHistorialEscalafon: (docenteId: string): Promise<{ docente: { id: string; name: string }; ficha: FichaSindical | null; historial: unknown[] }> =>
    apiClient.get(`/docentes/${docenteId}/historial-escalafon`).then(r => r.data.data),

  descargarInformePermisosSindicales: (periodoId: string): Promise<Blob> =>
    apiClient.get(`/reportes/permisos-sindicales/${periodoId}/pdf`, { responseType: 'blob' }).then(r => r.data),

  // ── Sprint 20 — Convocatorias Institucionales ────────────────────────────────

  getConvocatorias: (params?: { tipo?: string; estatus?: string }): Promise<Convocatoria[]> =>
    apiClient.get('/convocatorias', { params }).then(r => r.data.data),

  getConvocatoria: (id: string): Promise<Convocatoria> =>
    apiClient.get(`/convocatorias/${id}`).then(r => r.data.data),

  crearConvocatoria: (data: {
    titulo: string
    descripcion: string
    tipo: ConvocatoriaTipo
    fecha_apertura: string
    fecha_limite: string
    cupo_maximo?: number
    audiencia?: { roles?: string[] }
    requisitos?: { descripcion: string; tipo_documento?: string; obligatorio?: boolean }[]
  }): Promise<Convocatoria> =>
    apiClient.post('/convocatorias', data).then(r => r.data.data),

  actualizarEstatusConvocatoria: (id: string, estatus: ConvocatoriaEstatus): Promise<Convocatoria> =>
    apiClient.patch(`/convocatorias/${id}/estatus`, { estatus }).then(r => r.data.data),

  publicarResultados: (id: string): Promise<{ convocatoria: Convocatoria; notificados: number }> =>
    apiClient.post(`/convocatorias/${id}/publicar-resultados`).then(r => r.data.data),

  getPostulacionesPorConvocatoria: (convocatoriaId: string, params?: { estatus?: string }): Promise<Postulacion[]> =>
    apiClient.get(`/convocatorias/${convocatoriaId}/postulaciones`, { params }).then(r => r.data.data),

  postular: (convocatoriaId: string, data?: { documentos?: string[] }): Promise<Postulacion> =>
    apiClient.post(`/convocatorias/${convocatoriaId}/postulaciones`, data ?? {}).then(r => r.data.data),

  actualizarEstatusPostulacion: (postulacionId: string, data: { estatus: PostulacionEstatus; observaciones?: string }): Promise<Postulacion> =>
    apiClient.patch(`/postulaciones/${postulacionId}/estatus`, data).then(r => r.data.data),

  getMisPostulaciones: (userId: string): Promise<Postulacion[]> =>
    apiClient.get(`/users/${userId}/postulaciones`).then(r => r.data.data),

  // ── Sprint 18 — Personal Sindicalizado ──────────────────────────────────────

  getFichaSindical: (docenteId: string): Promise<FichaSindical> =>
    apiClient.get(`/docentes/${docenteId}/ficha-sindical`).then(r => r.data.data),

  registrarFichaSindical: (docenteId: string, data: {
    clave_plaza: string
    tipo_nombramiento: 'Base' | 'Interino' | 'Hora-Clase' | 'Medio-Tiempo'
    categoria_tbc?: string
    nivel_tbc?: string
    numero_issste?: string
    fecha_ingreso_sep: string
    fecha_ingreso_tecnm?: string
    departamento_id?: string
    activo?: boolean
  }): Promise<FichaSindical> =>
    apiClient.post(`/docentes/${docenteId}/ficha-sindical`, data).then(r => r.data.data),

  actualizarFichaSindical: (docenteId: string, data: Partial<{
    clave_plaza: string
    tipo_nombramiento: 'Base' | 'Interino' | 'Hora-Clase' | 'Medio-Tiempo'
    categoria_tbc?: string
    nivel_tbc?: string
    numero_issste?: string
    fecha_ingreso_sep: string
    fecha_ingreso_tecnm?: string
    departamento_id?: string
    activo?: boolean
  }>): Promise<FichaSindical> =>
    apiClient.patch(`/docentes/${docenteId}/ficha-sindical`, data).then(r => r.data.data),

  subirFotoUsuario: (usuarioId: string, file: File): Promise<{ foto_path: string; foto_url: string }> => {
    const fd = new FormData()
    fd.append('foto', file)
    return apiClient.post(`/admin/usuarios/${usuarioId}/foto`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data)
  },

  getPlazas: (params?: { tipo_nombramiento?: string; activo?: boolean; departamento_id?: string; page?: number }): Promise<{ data: FichaSindical[]; total: number; current_page: number; last_page: number }> =>
    apiClient.get('/plazas', { params }).then(r => r.data.data),

  registrarMovimientoPlaza: (plazaId: string, data: {
    tipo_movimiento: 'alta' | 'cambio_categoria' | 'baja' | 'reingreso'
    categoria_anterior?: string
    categoria_nueva?: string
    fecha_efectiva: string
    documento_soporte_url?: string
    notas?: string
  }): Promise<MovimientoPlaza> =>
    apiClient.post(`/plazas/${plazaId}/movimientos`, data).then(r => r.data.data),

  descargarPlantillaSindical: (params?: { tipo_nombramiento?: string }): Promise<Blob> =>
    apiClient.get('/reportes/plantilla-sindical/pdf', { params, responseType: 'blob' }).then(r => r.data),

  // ── Sprint 17 — Educación a Distancia (TecNM Cap. 16) ─────────────────────

  getProgramasDistancia: (params?: { activo?: boolean; carrera_id?: string }): Promise<{ data: ProgramaDistancia[] }> =>
    apiClient.get('/programas-distancia', { params }).then(r => r.data),

  crearProgramaDistancia: (data: {
    carrera_id: string
    modalidad: 'no_escolarizada' | 'mixta'
    creditos_minimos_carga?: number
    creditos_maximos_carga?: number
    semestres_maximos?: number
    permite_trimestral?: boolean
  }): Promise<ProgramaDistancia> =>
    apiClient.post('/programas-distancia', data).then(r => r.data.data),

  inscribirAlumnoDistancia: (data: {
    alumno_id: string
    programa_id: string
    periodo_ingreso_id: string
    carga_trimestral?: boolean
    modulo_competencias_acreditado?: boolean
  }): Promise<InscripcionDistancia> =>
    apiClient.post('/inscripciones-distancia', data).then(r => r.data.data),

  getAvanceDistancia: (alumnoId: string): Promise<AvanceDistancia> =>
    apiClient.get(`/alumnos/${alumnoId}/avance-distancia`).then(r => r.data.data),

  getSeguimientoDistancia: (): Promise<SeguimientoDistancia[]> =>
    apiClient.get('/seguimiento-distancia').then(r => r.data.data),

  getIndicadoresDistancia: (): Promise<IndicadoresDistancia> =>
    apiClient.get('/indicadores/distancia').then(r => r.data.data),
}

// ── Tipos Sprint 4 ────────────────────────────────────────────────────────────

export interface Calificacion {
  id: string
  alumno_id: string
  grupo_id: string
  carga_academica_id: string | null
  parciales: { parcial: number; calificacion: number }[] | null
  calificacion_final: number | null
  promedio: number | null
  acreditado: boolean | null
  tipo_curso: 'ordinario' | 'repeticion' | 'especial' | null
  intento_numero: number | null
  oportunidad: string | null
  publicada?: boolean
  kardex_actualizado?: boolean
  alumno?: { id: string; numero_control: string; user?: { name: string } }
}

export interface ResumenAsistenciaAlumno {
  total: number
  presentes: number
  ausentes: number
  retardos: number
  justificados: number
}

export interface SituacionAcademica {
  calificaciones: (Calificacion & {
    grupo?: { clave: string; cargas?: { materia?: { nombre: string } }[]; periodo?: { nombre: string } }
  })[]
  alertas_baja_definitiva: AlertaBajaDefinitiva[]
  resumen_asistencia: ResumenAsistenciaAlumno | null
}

export interface CorteCaptura {
  id: string
  periodo_id: string
  numero: 1 | 2 | 3
  nombre: string | null
  fecha_corte: string
  fecha_limite_captura: string
}

export interface AlertaCorteCaptura {
  id: string
  corte_captura_id: string
  carga_academica_id: string
  docente_id: string
  periodo_id: string
  porcentaje_capturado: number
  total_unidades_temario: number | null
  unidades_esperadas: number | null
  pendiente: boolean
  leida_docente: boolean
  leida_jefe: boolean
  leida_director: boolean
  corte_captura?: CorteCaptura
  carga_academica?: { id: string; materia?: { nombre: string } }
  docente?: { id: string; name: string }
}

export interface ResumenCumplimientoCorte {
  cargas_evaluadas: number
  cargas_pendientes: number
  detalle: {
    carga_academica_id: string
    docente_id: string
    docente_nombre: string | null
    materia_nombre: string | null
    porcentaje_capturado: number
    total_unidades_temario: number | null
    unidades_esperadas: number | null
    pendiente: boolean
  }[]
}

export interface ConfiguracionEvaluacion {
  id: string
  carrera_id: string
  peso_parciales: { parcial: number; peso: number }[]
  calificacion_minima: number
}

export interface ActaCalificaciones {
  id: string
  grupo_id: string
  periodo_id: string
  firmada: boolean
  fecha_firma: string | null
  integrada_libro_actas: boolean
}

/** Acta "de captura" (comprobante ligero generado desde la pantalla de Captura de
 * Calificaciones) — distinta de ActaCalificaciones (el acta oficial de Cierre de Curso). */
export interface ActaCalificacionesCaptura {
  id: string
  grupo_id: string
  carga_academica_id: string
  folio: string
  generado_por: string
  generado_en: string
  generado_por_nombre: string | null
  firmado_por: string | null
  firmado_en: string | null
  firmado_por_nombre: string | null
}

export interface EstadoActaCaptura {
  acta: ActaCalificacionesCaptura | null
  puede_firmar: boolean
  planeacion_liberada: boolean
  borrador: boolean
}

export interface AlertaBajaDefinitiva {
  id: string
  alumno_id: string
  grupo_id: string
  periodo_id: string
  materia_nombre: string
  intento_numero: number
  revisada: boolean
  revisada_por: string | null
  revisada_en: string | null
  alumno?: { id: string; numero_control: string; user?: { name: string }; carrera?: { nombre: string; clave: string } }
  grupo?: { clave: string; periodo?: { nombre: string } }
  revisada_por_user?: { name: string }
  created_at: string
}

// ── Tipos Sprint 11 ───────────────────────────────────────────────────────────

export interface FichaDocente {
  id: string
  docente_id: string
  tipo_contrato: 'base' | 'interino' | 'hora_clase' | 'medio_tiempo'
  categoria: string | null
  especialidades: string[] | null
  fecha_ingreso: string | null
  titulos_academicos: { nivel: string; nombre: string }[] | null
  horas_frente_grupo_por_periodo: { periodo_id: string; periodo_nombre: string; horas_semana: number }[] | null
  activo: boolean
  docente?: { id: string; name: string; email: string }
}

export interface ExpedienteAlumnoExt {
  id: string
  alumno_id: string
  generacion: number | null
  estatus: 'activo' | 'baja_temporal' | 'baja_definitiva' | 'egresado'
  promedio_general: number | null
  creditos_acumulados: number
  documentos_entregados: string[] | null
  notas_admin: string | null
}

export interface ExpedienteAlumnoResponse {
  alumno: {
    id: string
    numero_control: string
    semestre_actual: number
    estatus: string
    user?: { name: string; email: string }
    carrera?: { id: string; nombre: string; clave: string }
    periodoIngreso?: { id: string; nombre: string }
  }
  expediente_ext: ExpedienteAlumnoExt | null
  reinscripciones: { id: string; periodo?: { nombre: string }; estatus: string }[]
  bajas: { id: string; tipo_baja: string; estatus: string; created_at: string }[]
  constancias: { id: string; tipo: string; folio: string; created_at: string }[]
}

// ── Tipos Sprint 12 — Asistencia y Seguimiento Académico ─────────────────────

export interface SesionClase {
  id: string
  grupo_id: string
  carga_academica_id?: string | null
  docente_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  tema?: string
  codigo_checkin?: string | null
  checkin_expira_en?: string | null
  grupo?: { id: string; clave: string; semestre: number; carrera?: { nombre: string }; periodo?: { nombre: string } }
  docente?: { id: string; name: string; email: string }
  asistencias?: AsistenciaRegistro[]
  created_at: string
}

export interface AsistenciaRegistro {
  id: string
  sesion_id: string
  alumno_id: string
  estatus: 'presente' | 'ausente' | 'retardo' | 'justificado'
  observacion?: string
  alumno?: { id: string; name: string; email: string }
}

export interface AlertaInasistencia {
  id: string
  alumno_id: string
  grupo_id: string
  porcentaje_inasistencia: number
  leida_docente: boolean
  leida_jefe: boolean
  leida_director: boolean
  alumno?: { id: string; name: string; email: string }
  grupo?: { id: string; clave: string; semestre: number; carrera?: { nombre: string }; periodo?: { nombre: string } }
  created_at: string
}

export interface ReporteAsistenciaGrupo {
  grupo: { id: string; clave: string; semestre: number; carrera?: { nombre: string }; periodo?: { nombre: string } }
  total_sesiones: number
  sesiones: SesionClase[]
  resumen_alumnos: {
    alumno_id: string
    nombre: string
    presentes: number
    ausentes: number
    retardos: number
    justificados: number
    porcentaje_inasistencia: number
  }[]
}

export interface CargaDocenteItem {
  docente_id: string
  nombre: string
  email: string
  tipo_contrato?: string
  total_grupos: number
  total_horas_semana: number
  materias: string[]
}

// ── Tipos Sprint 3 — Horario de Trabajo Docente ───────────────────────────────

export interface HorarioTrabajo {
  id: string
  docente_id: string
  periodo_id: string
  carga_academica_json: Record<string, unknown>[] | null
  apoyo_docencia_json: Record<string, unknown>[] | null
  actividades_admin_json: Record<string, unknown>[] | null
  total_horas_semanales: number
  cct_docente: string | null
  tipo_nombramiento: string | null
  fecha_ingreso_sep: string | null
  url_pdf: string | null
  docente?: { id: string; name: string; email: string }
  periodo?: { id: string; nombre: string }
  created_at: string
  updated_at: string
}

// ── Tipos Sprint 13 — Egresados y Reportes Directivos ────────────────────────

export interface Egresado {
  id: string
  alumno_id: string
  anio_egreso: number
  titulado: boolean
  fecha_titulacion: string | null
  empresa_actual: string | null
  puesto_actual: string | null
  sector: 'publico' | 'privado' | 'emprendimiento' | 'desempleado' | 'otro' | null
  correo_actualizado: string | null
  alumno?: { id: string; name: string; email: string; carrera?: { nombre: string; clave: string } }
  created_at: string
  updated_at: string
}

export interface DashboardAsistencia {
  por_carrera: {
    carrera_id: string
    carrera_nombre: string
    total_grupos: number
    pct_asistencia_promedio?: number
    grupos_en_alerta?: number
    alumnos_en_alerta?: number
  }[]
  total_alertas: number
  periodo_id: string | null
}

// ── Tipos Sprint 14 — Programa Institucional de Tutoría ───────────────────────

export interface Tutor {
  id: string
  docente_id: string
  activo: boolean
  docente?: { id: string; name: string; email: string }
  tutorados?: number
  sesiones_registradas?: number
  created_at: string
}

export interface AsignacionTutoria {
  id: string
  tutor_id: string
  alumno_id: string
  periodo_id: string
  activa: boolean
  tutor?: { id: string; docente?: { id: string; name: string } }
  alumno?: { id: string; name: string; email: string }
  periodo?: { id: string; nombre: string }
  created_at: string
}

export interface SesionTutoria {
  id: string
  tutor_id: string
  tipo: 'individual' | 'grupal'
  fecha: string
  duracion_minutos: number
  temas_tratados: string
  observaciones: string | null
  alumnos_atendidos_ids: string[]
  tutor?: { id: string; docente?: { id: string; name: string } }
  created_at: string
}

export interface PlanAccionTutorial {
  id: string
  tutor_id: string
  periodo_id: string
  objetivo_general: string
  actividades: Record<string, unknown>[] | null
  metas: Record<string, unknown>[] | null
  estatus: 'borrador' | 'enviado' | 'aprobado'
  tutor?: { id: string; docente?: { id: string; name: string } }
  periodo?: { id: string; nombre: string }
  created_at: string
}

export interface DashboardTutoria {
  tutores_activos: number
  tutorados_asignados: number
  sesiones_registradas: number
  pct_alumnos_atendidos: number
  periodo_id: string | null
  por_tutor: Tutor[]
}

// ── Tipos Sprint 15 — Traslado, Convalidación y Equivalencia ─────────────────

export interface Traslado {
  id: string
  alumno_id: string
  tipo: 'entrada' | 'salida'
  instituto_origen: string | null
  instituto_destino: string | null
  fecha_solicitud: string
  estatus: 'solicitado' | 'aceptado' | 'rechazado'
  constancia_no_inconveniencia_url: string | null
  kardex_url: string | null
  motivo_rechazo: string | null
  alumno?: { id: string; name: string; email: string }
  created_at: string
}

export interface Convalidacion {
  id: string
  alumno_id: string
  materia_origen_nombre: string
  materia_origen_clave: string
  calificacion_obtenida: number
  institucion_origen: string
  materia_equivalente_id: string | null
  dictamen_url: string | null
  registrado_por: string
  alumno?: { id: string; name: string; email: string }
  materia_equivalente?: { id: string; nombre: string; clave: string }
  created_at: string
}

export interface MateriasEquivalencia {
  clave: string
  nombre: string
  calificacion: number
  creditos: number
  materia_equivalente_id?: string | null
}

export interface Equivalencia {
  id: string
  alumno_id: string
  institucion_origen: string
  materias_json: MateriasEquivalencia[]
  dictamen_url: string | null
  validado_por: string
  alumno?: { id: string; name: string; email: string }
  created_at: string
}

// ── Tipos Sprint 16 — Movilidad Estudiantil y Cursos de Verano ───────────────

export interface ConvenioMovilidad {
  id: string
  nombre_institucion: string
  tipo: 'tecnm' | 'nacional' | 'extranjera'
  vigente_desde: string
  vigente_hasta: string | null
  url_convenio: string | null
  activo: boolean
  created_at: string
}

export interface MovilidadEstudiantil {
  id: string
  alumno_id: string
  convenio_id: string | null
  ies_receptora: string
  semestres_acumulados_movilidad: number
  fecha_inicio: string
  fecha_fin: string | null
  materias_cursadas: { nombre: string; calificacion?: number; tipo_acreditacion: 'numerica' | 'AC' | 'NA' }[] | null
  estatus: 'activa' | 'concluida' | 'cancelada'
  alumno?: { id: string; name: string; email: string }
  convenio?: { id: string; nombre_institucion: string; tipo: string }
  created_at: string
}

export interface CursoVerano {
  id: string
  periodo_padre_id: string
  materia_id: string
  docente_id: string
  aula_id: string | null
  fecha_inicio: string
  fecha_fin: string | null
  max_alumnos: number
  min_alumnos: number
  estatus: 'programado' | 'activo' | 'cerrado' | 'cancelado'
  materia?: { id: string; nombre: string; clave: string; creditos: number }
  docente?: { id: string; name: string; email: string }
  periodo?: { id: string; nombre: string }
  inscripciones_count?: number
  created_at: string
}

export interface InscripcionVerano {
  id: string
  alumno_id: string
  curso_verano_id: string
  calificacion: number | null
  acreditado: boolean | null
  alumno?: { id: string; name: string; email: string }
  created_at: string
}

// ── Tipos Sprint 17 — Educación a Distancia ──────────────────────────────────

export interface ProgramaDistancia {
  id: string
  carrera_id: string
  modalidad: 'no_escolarizada' | 'mixta'
  creditos_minimos_carga: number
  creditos_maximos_carga: number
  semestres_maximos: number
  permite_trimestral: boolean
  activo: boolean
  carrera?: { id: string; nombre: string; clave: string }
  inscripciones_count?: number
  created_at: string
}

export interface InscripcionDistancia {
  id: string
  alumno_id: string
  programa_id: string
  periodo_ingreso_id: string
  carga_trimestral: boolean
  modulo_competencias_acreditado: boolean
  alumno?: { id: string; name: string; email: string }
  programa?: ProgramaDistancia
  periodo_ingreso?: { id: string; nombre: string }
  created_at: string
}

export interface AvanceDistancia {
  alumno: { id: string; name: string; numero_control: string }
  inscripcion_distancia: InscripcionDistancia | null
  semestres_cursados: number
  semestres_maximos: number
  creditos_minimos_carga: number
  creditos_maximos_carga: number
  alerta_riesgo: boolean
  porcentaje_tiempo_cursado: number
}

export interface SeguimientoDistancia {
  inscripcion: InscripcionDistancia
  semestres_cursados: number
  semestres_maximos: number
  alerta_riesgo: boolean
  modulo_pendiente: boolean
}

export interface IndicadoresDistancia {
  programas: ProgramaDistancia[]
  total_inscritos: number
  modulo_pendiente: number
  modulo_acreditado: number
}

// ── Sprint 19 — Permisos Sindicales y Escalafón ─────────────────────────────

export interface PermisoSindical {
  id: string
  docente_id: string
  tipo_permiso: 'comision_sindical' | 'licencia_con_goce' | 'licencia_sin_goce'
  fecha_inicio: string
  fecha_fin: string
  dias_totales: number
  con_goce_sueldo: boolean
  motivo: string
  oficio_generado: boolean
  autorizado_por: string
  periodo_id?: string
  docente?: { id: string; name: string; email: string }
  autorizadoPor?: { id: string; name: string }
  periodo?: { id: string; nombre: string }
  created_at: string
}

export interface ParticipanteConcurso {
  id: string
  concurso_id: string
  docente_id: string
  puntaje_obtenido?: number
  resultado: 'promovido' | 'no_promovido' | 'pendiente'
  movimiento_plaza_id?: string
  docente?: { id: string; name: string; email: string }
  movimientoPlaza?: MovimientoPlaza
}

export interface ConcursoOposicion {
  id: string
  nombre: string
  fecha_realizacion: string
  descripcion?: string
  convocado_por: string
  convocadoPor?: { id: string; name: string }
  participantes?: ParticipanteConcurso[]
  created_at: string
}

export interface AusentismoDashboard {
  total_permisos_activos: number
  permisos_activos: PermisoSindical[]
  docentes_mas_de_5_dias: { docente_id: string; total_dias: number; docente?: { name: string; email: string } }[]
  total_docentes_mas_5_dias: number
  grupos_afectados: { grupo?: { clave: string }; materia?: { nombre: string }; docente_id: string }[]
  total_grupos_afectados: number
}

// ── Sprint 18 — Personal Sindicalizado ──────────────────────────────────────

export interface MovimientoPlaza {
  id: string
  ficha_sindical_id: string
  tipo_movimiento: 'alta' | 'cambio_categoria' | 'baja' | 'reingreso'
  categoria_anterior?: string
  categoria_nueva?: string
  fecha_efectiva: string
  documento_soporte_url?: string
  registrado_por: string
  notas?: string
  registradoPor?: { id: string; name: string }
  created_at: string
}

export interface FichaSindical {
  id: string
  docente_id: string
  clave_plaza: string
  tipo_nombramiento: 'Base' | 'Interino' | 'Hora-Clase' | 'Medio-Tiempo'
  categoria_tbc?: string
  nivel_tbc?: string
  numero_issste?: string
  fecha_ingreso_sep: string
  fecha_ingreso_tecnm?: string
  anios_servicio: number
  departamento_id?: string
  activo: boolean
  alerta_fecha?: boolean
  docente?: { id: string; name: string; email: string }
  departamento?: { id: string; nombre: string }
  movimientos?: MovimientoPlaza[]
  created_at: string
}

// ── Sprint 20 — Convocatorias Institucionales ────────────────────────────────

export interface RequisitoConvocatoria {
  id: string
  convocatoria_id: string
  descripcion: string
  tipo_documento?: string
  obligatorio: boolean
}

export type ConvocatoriaEstatus = 'borrador' | 'activa' | 'cerrada' | 'resultados_publicados'
export type ConvocatoriaTipo = 'beca' | 'movilidad' | 'ss' | 'curso_verano' | 'concurso' | 'bolsa_trabajo' | 'otro'

export interface Convocatoria {
  id: string
  titulo: string
  descripcion: string
  tipo: ConvocatoriaTipo
  audiencia?: { roles?: string[] }
  fecha_apertura: string
  fecha_limite: string
  cupo_maximo?: number
  estatus: ConvocatoriaEstatus
  publicada_por: string
  requisitos?: RequisitoConvocatoria[]
  publicadoPor?: { id: string; name: string }
  created_at: string
}

export type PostulacionEstatus = 'pendiente' | 'en_revision' | 'admitido' | 'no_admitido'

export interface Postulacion {
  id: string
  convocatoria_id: string
  user_id: string
  estatus: PostulacionEstatus
  documentos: string[]
  observaciones?: string
  revisado_por?: string
  fecha_postulacion: string
  convocatoria?: Pick<Convocatoria, 'id' | 'titulo' | 'tipo' | 'estatus'>
  postulante?: { id: string; name: string; email: string }
  revisadoPor?: { id: string; name: string }
}

// ── Builder de Horarios ───────────────────────────────────────────────────────

export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado'
export type EstadoCarga = 'pendiente' | 'confirmada' | 'conflicto'

export interface DisponibilidadBloque {
  id?: string
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fin:    string
}

export interface DiaNoLaborable {
  id: string
  fecha: string
  descripcion: string
}

export type EstadoSlot =
  | 'disponible'
  | 'fuera_disponibilidad'
  | 'reservado'
  | 'grupo_ocupado'

export interface BuilderSlot {
  hora:         string
  estado:       EstadoSlot
  carga_id?:    string
  horario_id?:  string
  materia?:     string
  materia_id?:  string
  grupo?:       string
  grupo_ids?:   string[]
  aula?:        string
  aula_id?:     string
  carga_estado?: EstadoCarga
  hora_inicio?: string
  hora_fin?:    string
  docente?:     string
  misma_carrera?: boolean | null
}

export interface BuilderDia {
  dia_semana:    DiaSemana
  disponibilidad: { hora_inicio: string; hora_fin: string }[]
  horas:         BuilderSlot[]
  horas_modulo2: BuilderSlot[] | null
}

export interface VerificacionResultado {
  conflictos:            { tipo: string; mensaje: string }[]
  dentro_disponibilidad: boolean
  mensaje_disponibilidad?: string | null
}

export interface ResumenHoras {
  horas_semana: number
  asignadas:    number
  restantes:    number
}
