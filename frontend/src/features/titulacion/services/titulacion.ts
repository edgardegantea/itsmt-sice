import apiClient from '../../../config/apiClient'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ModalidadTitulacion {
  id: string
  nombre: string
  opcion_numero: number
  descripcion: string | null
  requiere_examen: boolean
  requiere_tesis: boolean
  documentos_requeridos: string[] | null
}

export interface CertificadoIdioma {
  id: string
  alumno_id: string
  idioma: string
  nivel: string
  institucion_certificadora: string
  fecha_expedicion: string
  fecha_vencimiento: string | null
  url_documento: string | null
  validado: boolean
  validado_por: string | null
  alumno?: { id: string; numero_control: string; user?: { name: string }; carrera?: { nombre: string } }
  validadoPor?: { id: string; name: string }
  created_at: string
  updated_at: string
}

export interface ConstanciaNoInconveniencia {
  id: string
  solicitud_id: string
  emitida_por: string
  url_pdf: string | null
  fecha_emision: string
  emitidaPor?: { id: string; name: string }
}

export interface SolicitudActoProtocolario {
  id: string
  alumno_id: string
  modalidad_id: string
  estatus: 'pendiente_revision' | 'no_procede' | 'con_no_inconveniencia' | 'agendado' | 'aprobado' | 'reprobado' | 'exento'
  motivo_improcedencia: string | null
  retake_plazo_hasta: string | null
  alumno?: { id: string; numero_control: string; user?: { name: string }; carrera?: { nombre: string } }
  modalidad?: ModalidadTitulacion
  constanciaNoInconveniencia?: ConstanciaNoInconveniencia
  actoProtocolario?: ActoProtocolario
  created_at: string
  updated_at: string
}

export interface SinodalItem {
  nombre: string
  rol_sinodal: string
  usuario_id?: string
}

export interface ActoProtocolario {
  id: string
  solicitud_id: string
  fecha: string
  hora: string
  lugar: string
  sinodales_json: SinodalItem[] | null
  aviso_enviado_en: string | null
  libro_actas_folio: string | null
  resultado: 'pendiente' | 'aprobado' | 'reprobado'
  url_aviso_pdf: string | null
  url_acta_pdf: string | null
  url_constancia_exencion_pdf: string | null
  firmado_jefe_servicios: boolean
  firmado_director: boolean
  solicitud?: SolicitudActoProtocolario
  created_at: string
  updated_at: string
}

export interface SalidaLateral {
  id: string
  alumno_id: string
  periodo_solicitud_id: string
  porcentaje_creditos_al_solicitar: number
  asignatura_especialidad_id: string
  estatus: 'solicitado' | 'en_revision' | 'aprobado' | 'rechazado'
  url_diploma: string | null
  aprobado_por: string | null
  alumno?: { id: string; numero_control: string; user?: { name: string }; carrera?: { nombre: string } }
  periodoSolicitud?: { id: string; nombre: string }
  asignaturaEspecialidad?: { id: string; nombre: string; clave: string }
  aprobadoPor?: { id: string; name: string }
  created_at: string
  updated_at: string
}

// ── API ───────────────────────────────────────────────────────────────────────

export const titulacionApi = {
  // Modalidades
  getModalidades: () =>
    apiClient.get('/modalidades-titulacion').then(r => r.data.data as ModalidadTitulacion[]),

  // Certificados de idioma
  getCertificadosIdioma: (params?: { validado?: boolean; alumno_id?: string }) =>
    apiClient.get('/certificados-idioma', { params }).then(r => r.data.data),

  registrarCertificadoIdioma: (data: {
    alumno_id?: string
    idioma?: string
    nivel?: string
    institucion_certificadora: string
    fecha_expedicion: string
    fecha_vencimiento?: string
    url_documento?: string
  }) => apiClient.post('/certificados-idioma', data).then(r => r.data.data as CertificadoIdioma),

  validarCertificado: (id: string) =>
    apiClient.patch(`/certificados-idioma/${id}/validar`).then(r => r.data.data as CertificadoIdioma),

  // Solicitudes Acto Protocolario
  getSolicitudesActo: (params?: { estatus?: string; alumno_id?: string }) =>
    apiClient.get('/solicitudes-acto-protocolario', { params }).then(r => r.data.data),

  crearSolicitudActo: (modalidadId: string) =>
    apiClient.post('/solicitudes-acto-protocolario', { modalidad_id: modalidadId })
      .then(r => r.data.data as SolicitudActoProtocolario),

  emitirNoInconveniencia: (id: string, data: { procede: boolean; motivo_improcedencia?: string }) =>
    apiClient.patch(`/solicitudes-acto-protocolario/${id}/no-inconveniencia`, data)
      .then(r => r.data.data as SolicitudActoProtocolario),

  getNoInconvenienciaPdfUrl: (id: string) => `/api/solicitudes-acto-protocolario/${id}/no-inconveniencia/pdf`,

  // Actos Protocolarios
  programarActo: (data: {
    solicitud_id: string
    fecha: string
    hora: string
    lugar: string
    sinodales_json?: SinodalItem[]
    libro_actas_folio?: string
  }) => apiClient.post('/actos-protocolarios', data).then(r => r.data.data as ActoProtocolario),

  getAvisoPdfUrl: (id: string) => `/api/actos-protocolarios/${id}/aviso/pdf`,

  registrarResultado: (id: string, data: { resultado: 'aprobado' | 'reprobado'; firmado_jefe_servicios?: boolean; firmado_director?: boolean }) =>
    apiClient.patch(`/actos-protocolarios/${id}/resultado`, data).then(r => r.data.data as ActoProtocolario),

  getActaPdfUrl: (id: string) => `/api/actos-protocolarios/${id}/acta/pdf`,

  getConstanciaExencionPdfUrl: (id: string) => `/api/actos-protocolarios/${id}/constancia-exencion/pdf`,

  // Salida Lateral
  getSalidaLateral: (params?: { estatus?: string }) =>
    apiClient.get('/salida-lateral', { params }).then(r => r.data.data),

  crearSolicitudSalidaLateral: (data: {
    alumno_id?: string
    periodo_solicitud_id: string
    asignatura_especialidad_id: string
  }) => apiClient.post('/salida-lateral', data).then(r => r.data.data as SalidaLateral),

  actualizarEstatusSalidaLateral: (id: string, estatus: 'en_revision' | 'aprobado' | 'rechazado') =>
    apiClient.patch(`/salida-lateral/${id}/estatus`, { estatus }).then(r => r.data.data as SalidaLateral),

  getDiplomaSalidaLateralUrl: (id: string) => `/api/salida-lateral/${id}/diploma/pdf`,
}
