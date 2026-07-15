import apiClient from '../../../config/apiClient'

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

export interface Grupo {
  id: string
  carrera_id: string
  periodo_id: string
  clave: string
  semestre: number
  turno: 'matutino' | 'vespertino' | 'sabatino'
  capacidad: number
  activo: boolean
  horarios_liberados: boolean
  alumnos_count?: number
  carrera?: { id: string; nombre: string; clave: string }
  periodo?: { id: string; nombre: string }
  alumnos?: AlumnoGrupo[]
  cargas?: CargaAcademica[]
}

export interface AlumnoGrupo {
  id: string
  numero_control: string
  semestre_actual: number
  user?: { name: string; email: string }
  inscripcion?: { aspirante?: { nombres: string; apellido_paterno: string; apellido_materno?: string } }
  pivot?: { fecha_asignacion: string }
}

export interface CargaAcademica {
  id: string
  docente_id: string
  materia_id: string
  grupo_id: string
  periodo_id: string
  aula_id?: string
  horas_semana: number
  docente?: { id: string; name: string; email: string }
  materia?: Materia
  grupo?: Grupo
  periodo?: { id: string; nombre: string }
  aula?: { id: string; nombre: string; tipo: string; capacidad: number }
  horarios?: Horario[]
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

export interface Horario {
  id: string
  carga_academica_id: string
  dia_semana: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado'
  hora_inicio: string
  hora_fin: string
  carga_academica?: CargaAcademica
}

export type EstatusPlaneacion = 'borrador' | 'entregada' | 'revisada' | 'liberada' | 'devuelta'

export interface PlaneacionDocente {
  id: string
  carga_academica_id: string
  docente_id: string
  periodo_id: string
  archivo_url: string | null
  estatus: EstatusPlaneacion
  caracterizacion: string | null
  intencion_didactica: string | null
  competencias: { descripcion?: string; [key: string]: unknown }[] | null
  fuentes_informacion: string | null
  apoyos_didacticos: string | null
  calendarizacion: { semana?: number; tema?: string; [key: string]: unknown }[] | null
  fecha_entrega: string | null
  observaciones_revision: string | null
  revisado_en: string | null
  docente?: { id: string; name: string }
  periodo?: { id: string; nombre: string }
  carga_academica?: CargaAcademica
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

  // Cargas académicas
  getCargas: (params?: Record<string, string>) =>
    apiClient.get('/cargas-academicas', { params }).then(r => r.data.data as CargaAcademica[]),
  createCarga: (d: Partial<CargaAcademica>) =>
    apiClient.post('/cargas-academicas', d).then(r => r.data.data as CargaAcademica),
  updateCarga: (id: string, d: Partial<CargaAcademica>) =>
    apiClient.patch(`/cargas-academicas/${id}`, d).then(r => r.data.data as CargaAcademica),
  deleteCarga: (id: string) =>
    apiClient.delete(`/cargas-academicas/${id}`),
  getDocentes: () =>
    apiClient.get('/admin/docentes').then(r => r.data.data as { id: string; name: string; email: string; clave_empleado?: string; no_huella?: string; nombramiento?: string; tipo_horas?: string }[]),

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
  savePlaneacion: (d: Partial<PlaneacionDocente>) =>
    apiClient.post('/planeaciones-docentes', d).then(r => r.data.data as PlaneacionDocente),
  entregarPlaneacion: (id: string) =>
    apiClient.post(`/planeaciones-docentes/${id}/entregar`, {}).then(r => r.data.data as PlaneacionDocente),
  cambiarEstatusPlaneacion: (id: string, estatus: string, observaciones?: string) =>
    apiClient.patch(`/planeaciones-docentes/${id}/estatus`, { estatus, observaciones_revision: observaciones }).then(r => r.data.data as PlaneacionDocente),

  // ── Sprint 4 — Calificaciones ─────────────────────────────────────────────

  getCalificacionesGrupo: (grupoId: string): Promise<Calificacion[]> =>
    apiClient.get(`/grupos/${grupoId}/calificaciones`).then(r => r.data.data),

  registrarCalificacion: (data: {
    alumno_id: string
    grupo_id: string
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

  firmarActa: (grupoId: string): Promise<ActaCalificaciones> =>
    apiClient.patch(`/grupos/${grupoId}/acta-calificaciones/firmar`, {}).then(r => r.data.data),

  getAlertas: (params?: { revisada?: boolean; carrera_id?: string }): Promise<{ data: AlertaBajaDefinitiva[]; meta: unknown }> =>
    apiClient.get('/alertas-baja-definitiva', { params: {
      ...(params?.revisada !== undefined && { revisada: params.revisada ? 1 : 0 }),
      ...(params?.carrera_id && { carrera_id: params.carrera_id }),
    }}).then(r => r.data.data),

  revisarAlerta: (id: string): Promise<AlertaBajaDefinitiva> =>
    apiClient.patch(`/alertas-baja-definitiva/${id}/revisar`, {}).then(r => r.data.data),

  // ── Builder de Horarios ──────────────────────────────────────────────────────
  getDisponibilidadDocente: (params: { docente_id: string; periodo_id: string }): Promise<{ bloques: DisponibilidadBloque[]; dias_no_laborables: DiaNoLaborable[] }> =>
    apiClient.get('/disponibilidad-docente', { params }).then(r => r.data.data),

  saveDisponibilidadDocente: (data: { docente_id: string; periodo_id: string; bloques: Omit<DisponibilidadBloque, 'id'>[] }): Promise<DisponibilidadBloque[]> =>
    apiClient.put('/disponibilidad-docente', data).then(r => r.data.data),

  getBuilderGrid: (params: { periodo_id: string; docente_id: string; grupo_id?: string }): Promise<{ dias: BuilderDia[] }> =>
    apiClient.get('/horarios/builder-grid', { params }).then(r => r.data.data),

  verificarDisponibilidad: (data: {
    periodo_id: string; docente_id: string; dia_semana: string
    hora_inicio: string; hora_fin: string
    aula_id?: string; grupo_id?: string; materia_id?: string; ignorar_carga_id?: string
  }): Promise<{ resultado: VerificacionResultado; horas: ResumenHoras | null }> =>
    apiClient.post('/horarios/verificar-disponibilidad', data).then(r => r.data.data),

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

  getConcentradoUrl: (params: { periodo_id: string; carrera_id?: string }): string => {
    const qs = new URLSearchParams({ periodo_id: params.periodo_id, ...(params.carrera_id ? { carrera_id: params.carrera_id } : {}) })
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
  parciales: { parcial: number; calificacion: number }[] | null
  calificacion_final: number | null
  promedio: number | null
  acreditado: boolean | null
  tipo_curso: 'ordinario' | 'repeticion' | 'especial' | null
  intento_numero: number | null
  oportunidad: string | null
  alumno?: { id: string; numero_control: string; user?: { name: string } }
}

export interface SituacionAcademica {
  calificaciones: (Calificacion & {
    grupo?: { clave: string; cargas?: { materia?: { nombre: string } }[]; periodo?: { nombre: string } }
  })[]
  alertas_baja_definitiva: AlertaBajaDefinitiva[]
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
  docente_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  tema?: string
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
  materia?:     string
  materia_id?:  string
  grupo?:       string
  grupo_id?:    string
  aula?:        string
  aula_id?:     string
  carga_estado?: EstadoCarga
  hora_inicio?: string
  hora_fin?:    string
  docente?:     string
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
