import apiClient from '../../../config/apiClient'

export interface AsignacionDocente {
  id: string
  docente_id: string
  materia_id: string
  carrera_id: string
  periodo_id: string
  grupo_id: string | null
  horas_semana: number
  asignado_por: string
  notificado: boolean
  docente?: { id: string; name: string; email: string }
  materia?: { id: string; nombre: string; clave: string; creditos: number }
  carrera?: { id: string; nombre: string; clave: string }
  periodo?: { id: string; nombre: string }
  grupo?: { id: string; clave: string } | null
  instrumentacion?: InstrumentacionDidactica | null
}

export interface InstrumentacionDidactica {
  id: string
  asignacion_id: string
  periodo_id: string
  objetivo_general: string | null
  competencias: string[] | null
  unidades: UnidadDidactica[] | null
  metodologia: string | null
  criterios_evaluacion: Record<string, number> | null
  bibliografia: string | null
  estatus: 'borrador' | 'enviada' | 'observaciones' | 'liberada' | 'vigente'
  observaciones_jefe: string | null
  liberada_por: string | null
  visto_bueno_por: string | null
  asignacion?: AsignacionDocente
  liberadaPor?: { id: string; name: string } | null
  vistoBuenoPor?: { id: string; name: string } | null
}

export interface UnidadDidactica {
  nombre: string
  objetivo: string
  contenido?: string
  actividades?: string
  recursos?: string
  evaluacion?: string
}

export interface CargaHoraria {
  docente_id: string
  periodo_id: string | null
  total_horas: number
  asignaciones: AsignacionDocente[]
}

export interface AsignacionParams {
  carrera_id?: string
  periodo_id?: string
  docente_id?: string
}

export const planeacionApi = {
  // Asignaciones
  getAsignaciones: (params?: AsignacionParams) =>
    apiClient.get('/asignaciones-docentes', { params }).then(r => r.data.data as AsignacionDocente[]),

  crearAsignacion: (data: {
    docente_id: string
    materia_id: string
    carrera_id: string
    periodo_id: string
    grupo_id?: string
    horas_semana: number
  }) => apiClient.post('/asignaciones-docentes', data).then(r => r.data.data as AsignacionDocente),

  actualizarAsignacion: (id: string, data: Partial<{ docente_id: string; grupo_id: string; horas_semana: number }>) =>
    apiClient.patch(`/asignaciones-docentes/${id}`, data).then(r => r.data.data as AsignacionDocente),

  getCargaHoraria: (docenteId: string, periodoId?: string) =>
    apiClient.get(`/docentes/${docenteId}/carga-horaria`, {
      params: periodoId ? { periodo_id: periodoId } : undefined,
    }).then(r => r.data.data as CargaHoraria),

  // Instrumentaciones
  getInstrumentaciones: (params?: { periodo_id?: string; docente_id?: string }) =>
    apiClient.get('/instrumentaciones-didacticas', { params }).then(r => r.data.data as InstrumentacionDidactica[]),

  crearInstrumentacion: (data: Partial<InstrumentacionDidactica> & { asignacion_id: string }) =>
    apiClient.post('/instrumentaciones-didacticas', data).then(r => r.data.data as InstrumentacionDidactica),

  actualizarInstrumentacion: (id: string, data: Partial<InstrumentacionDidactica>) =>
    apiClient.patch(`/instrumentaciones-didacticas/${id}`, data).then(r => r.data.data as InstrumentacionDidactica),

  enviarInstrumentacion: (id: string) =>
    apiClient.patch(`/instrumentaciones-didacticas/${id}/enviar`).then(r => r.data.data as InstrumentacionDidactica),

  liberarInstrumentacion: (id: string, accion: 'liberar' | 'devolver', observaciones?: string) =>
    apiClient.patch(`/instrumentaciones-didacticas/${id}/liberar`, { accion, observaciones })
      .then(r => r.data.data as InstrumentacionDidactica),

  vistoBueno: (id: string) =>
    apiClient.patch(`/instrumentaciones-didacticas/${id}/visto-bueno`).then(r => r.data.data as InstrumentacionDidactica),
}
