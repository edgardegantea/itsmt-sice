import apiClient from '../../../config/apiClient'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ServicioSocial {
  id: string
  alumno_id: string
  empresa: string
  responsable: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  estatus: 'solicitado' | 'aprobado' | 'rechazado' | 'en_curso' | 'acreditado'
  horas_acumuladas: number
  nivel_desempeno: 'excelente' | 'notable' | 'bueno' | 'suficiente' | 'insuficiente' | null
  creditos_otorgados: number
  documentos: unknown[] | null
  alumno?: { id: string; numero_control: string; user?: { name: string }; carrera?: { nombre: string } }
  created_at: string
  updated_at: string
}

export interface DatosEmpresaRp {
  nombre: string
  giro?: string
  rfc?: string
  domicilio?: string
  mision?: string
  titular?: string
  asesor_externo?: string
  firmante_acuerdo?: string
}

export interface SolicitudRp {
  id: string
  alumno_id: string
  opcion: 'banco_proyectos' | 'propuesta_propia' | 'trabajador'
  datos_empresa: DatosEmpresaRp
  numero_seguro_social: string | null
  tipo_seguro: 'imss' | 'issste' | null
  periodo_proyectado: string | null
  estatus: 'pendiente_dictamen' | 'con_dictamen_aceptado' | 'con_dictamen_rechazado'
  alumno?: { id: string; numero_control: string; user?: { name: string }; carrera?: { nombre: string } }
  dictamen?: DictamenAnteproyecto
  created_at: string
  updated_at: string
}

export interface DictamenAnteproyecto {
  id: string
  solicitud_rp_id: string
  alumno_id: string
  anteproyecto: string | null
  empresa: string | null
  asesor_interno_id: string | null
  asesor_externo: string | null
  dictamen: 'aceptado' | 'rechazado'
  fecha_dictamen: string
  url_pdf: string | null
  presidente_academia_id: string | null
  jefe_depto_id: string | null
  subdirector_academico_id: string | null
  asesorInterno?: { id: string; name: string }
  solicitudRp?: SolicitudRp
  created_at: string
  updated_at: string
}

export interface ResidenciaProfesional {
  id: string
  solicitud_rp_id: string
  alumno_id: string
  asesor_id: string | null
  empresa: string | null
  proyecto: string | null
  estatus: 'asignado' | 'en_curso' | 'acreditado' | 'no_acreditado'
  etapa_actual: number
  horas_acumuladas: number
  calificacion_seguimiento_1: number | null
  calificacion_seguimiento_2: number | null
  calificacion_reporte_final: number | null
  calificacion_final: number | null
  carta_presentacion_generada: boolean
  url_oficio_asesor: string | null
  alumno?: { id: string; numero_control: string; user?: { name: string }; carrera?: { nombre: string } }
  asesor?: { id: string; name: string; email: string }
  solicitudRp?: SolicitudRp
  created_at: string
  updated_at: string
}

export interface AsesoriaRp {
  id: string
  residencia_id: string
  asesor_interno_id: string
  num_asesoria: number
  fecha: string
  lugar: string | null
  tipo: string | null
  temas: string[] | null
  solucion_recomendada: string | null
  asesorInterno?: { id: string; name: string }
  residencia?: ResidenciaProfesional
  created_at: string
  updated_at: string
}

export interface PrerequisitosRp {
  ss_acreditado: boolean
  ac_completadas: boolean
  porcentaje_creditos: number
  creditos_acreditados: number
  creditos_totales: number
  dentro_limite_semestres: boolean
  semestre_actual: number
  puede_solicitar_rp: boolean
}

// ── API ───────────────────────────────────────────────────────────────────────

export const vinculacionApi = {
  // Servicio Social
  getServicioSocial: (params?: { estatus?: string; alumno_id?: string; carrera_id?: string }) =>
    apiClient.get('/servicio-social', { params }).then(r => r.data.data),

  registrarServicioSocial: (data: { empresa: string; responsable?: string; fecha_inicio?: string; documentos?: unknown[] }) =>
    apiClient.post('/servicio-social', data).then(r => r.data.data as ServicioSocial),

  actualizarEstatusServicioSocial: (
    id: string,
    data: { estatus: 'solicitado' | 'aprobado' | 'rechazado' | 'en_curso' | 'acreditado'; horas_acumuladas?: number; nivel_desempeno?: string; fecha_fin?: string }
  ) => apiClient.patch(`/servicio-social/${id}/estatus`, data).then(r => r.data.data as ServicioSocial),

  // Verificar prerrequisitos RP
  verificarPrerequisitosRp: (alumnoId: string) =>
    apiClient.get(`/alumnos/${alumnoId}/verificar-prerequisitos-residencia`).then(r => r.data.data as PrerequisitosRp),

  // Solicitudes RP
  getSolicitudesRp: (params?: { estatus?: string; alumno_id?: string }) =>
    apiClient.get('/solicitudes-rp', { params }).then(r => r.data.data),

  crearSolicitudRp: (data: {
    opcion: 'banco_proyectos' | 'propuesta_propia' | 'trabajador'
    datos_empresa: DatosEmpresaRp
    numero_seguro_social?: string
    tipo_seguro?: 'imss' | 'issste'
    periodo_proyectado?: string
  }) => apiClient.post('/solicitudes-rp', data).then(r => r.data.data as SolicitudRp),

  // Dictámenes de anteproyecto
  registrarDictamen: (data: {
    solicitud_rp_id: string
    anteproyecto?: string
    empresa?: string
    asesor_interno_id?: string
    asesor_externo?: string
    dictamen: 'aceptado' | 'rechazado'
    fecha_dictamen: string
    presidente_academia_id?: string
    jefe_depto_id?: string
    subdirector_academico_id?: string
  }) => apiClient.post('/dictamenes-anteproyecto', data).then(r => r.data.data as DictamenAnteproyecto),

  getDictamenPdfUrl: (dictamenId: string) => `/api/dictamenes-anteproyecto/${dictamenId}/pdf`,

  // Residencias profesionales
  getResidencias: (params?: { estatus?: string; asesor_id?: string }) =>
    apiClient.get('/residencias', { params }).then(r => r.data.data),

  crearResidencia: (data: { solicitud_rp_id: string; empresa?: string; proyecto?: string }) =>
    apiClient.post('/residencias', data).then(r => r.data.data as ResidenciaProfesional),

  asignarAsesor: (residenciaId: string, asesorId: string) =>
    apiClient.patch(`/residencias/${residenciaId}/asesor`, { asesor_id: asesorId }).then(r => r.data.data as ResidenciaProfesional),

  getOficioAsesorPdfUrl: (residenciaId: string) => `/api/residencias/${residenciaId}/oficio-asesor/pdf`,

  registrarSeguimiento: (residenciaId: string, data: { tipo: 'seguimiento_1' | 'seguimiento_2'; calificacion: number; horas_acumuladas?: number }) =>
    apiClient.patch(`/residencias/${residenciaId}/seguimiento`, data).then(r => r.data.data as ResidenciaProfesional),

  registrarEvaluacionReporte: (residenciaId: string, calificacionFinal: number) =>
    apiClient.patch(`/residencias/${residenciaId}/evaluacion-reporte`, { calificacion_reporte_final: calificacionFinal }).then(r => r.data.data as ResidenciaProfesional),

  // Asesorías RP
  getAsesoriasRp: (params?: { residencia_id?: string }) =>
    apiClient.get('/asesorias-rp', { params }).then(r => r.data.data),

  registrarAsesoriaRp: (data: { residencia_id: string; fecha: string; lugar?: string; tipo?: string; temas?: string[]; solucion_recomendada?: string }) =>
    apiClient.post('/asesorias-rp', data).then(r => r.data.data as AsesoriaRp),
}
