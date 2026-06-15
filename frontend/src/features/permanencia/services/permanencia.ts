import apiClient from '../../../config/apiClient'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EstatusReinscripcion = 'pendiente' | 'aprobada' | 'rechazada'
export type TipoConstancia = 'estudios' | 'inscripcion' | 'calificaciones'
export type TipoBaja = 'parcial' | 'temporal' | 'definitiva'

export interface Reinscripcion {
  id: string
  alumno_id: string
  periodo_id: string
  estatus: EstatusReinscripcion
  observaciones: string | null
  aprobado_por: string | null
  aprobado_en: string | null
  resello_registrado: boolean
  fecha_resello: string | null
  created_at: string
  alumno?: {
    id: string
    numero_control: string
    semestre_actual: number
    user?: { name: string; email: string }
    carrera?: { nombre: string }
  }
  periodo?: { id: string; nombre: string }
}

export interface Constancia {
  id: string
  alumno_id: string
  tipo: TipoConstancia
  folio_unico: string
  estatus: 'solicitada' | 'emitida'
  emitida_en: string | null
  created_at: string
  alumno?: {
    id: string
    numero_control: string
    user?: { name: string }
    carrera?: { nombre: string }
  }
  solicitada_por?: { name: string }
  emitida_por?: { name: string } | null
}

export interface Baja {
  id: string
  alumno_id: string
  periodo_id: string
  tipo_baja: TipoBaja
  motivo_enum: string | null
  motivo_texto: string | null
  fecha_solicitud: string
  fecha_efectiva: string | null
  reingreso_posible: boolean
  numero_semestres_cursados: number | null
  alumno?: { numero_control: string; user?: { name: string } }
  periodo?: { nombre: string }
}

export interface Adeudo {
  id: string
  concepto: string
  monto: string
  pagado: boolean
}

export interface OrdenReinscripcion {
  id: string
  periodo_id: string
  carrera_id: string
  semestre: number
  fecha_inicio_reinscripcion: string
  fecha_fin_reinscripcion: string
  publicado: boolean
  publicado_en: string | null
  carrera?: { id: string; nombre: string }
}

// ── API ───────────────────────────────────────────────────────────────────────

export const permanenciaApi = {
  // Reinscripciones
  getReinscripciones: (params?: Record<string, string>): Promise<any> =>
    apiClient.get('/reinscripciones', { params }).then(r => r.data.data),

  solicitarReinscripcion: (periodoId: string): Promise<Reinscripcion> =>
    apiClient.post('/reinscripciones', { periodo_id: periodoId }).then(r => r.data.data),

  actualizarEstatusReinscripcion: (id: string, estatus: EstatusReinscripcion, observaciones?: string): Promise<Reinscripcion> =>
    apiClient.patch(`/reinscripciones/${id}/estatus`, { estatus, observaciones }).then(r => r.data.data),

  registrarResello: (id: string): Promise<Reinscripcion> =>
    apiClient.patch(`/reinscripciones/${id}/resello-credencial`, {}).then(r => r.data.data),

  // Adeudos
  getAdeudos: (alumnoId: string): Promise<Adeudo[]> =>
    apiClient.get(`/alumnos/${alumnoId}/adeudos`).then(r => r.data.data),

  // Orden de reinscripción
  publicarOrden: (data: {
    periodo_id: string
    carrera_id: string
    semestre: number
    fecha_inicio_reinscripcion: string
    fecha_fin_reinscripcion: string
  }): Promise<OrdenReinscripcion> =>
    apiClient.post('/orden-reinscripcion', data).then(r => r.data.data),

  getOrdenReinscripcion: (periodoId: string): Promise<OrdenReinscripcion[]> =>
    apiClient.get(`/orden-reinscripcion/${periodoId}`).then(r => r.data.data),

  // Constancias
  getConstancias: (params?: Record<string, string>): Promise<any> =>
    apiClient.get('/constancias', { params }).then(r => r.data.data),

  getConstanciasAlumno: (alumnoId: string): Promise<Constancia[]> =>
    apiClient.get(`/alumnos/${alumnoId}/constancias`).then(r => r.data.data),

  solicitarConstancia: (tipo: TipoConstancia): Promise<Constancia> =>
    apiClient.post('/constancias', { tipo }).then(r => r.data.data),

  emitirConstancia: (id: string): Promise<Constancia> =>
    apiClient.post(`/constancias/${id}/emitir`, {}).then(r => r.data.data),

  // Bajas
  registrarBaja: (data: {
    alumno_id: string
    periodo_id: string
    tipo_baja: TipoBaja
    motivo_enum?: string
    motivo_texto?: string
    fecha_solicitud: string
    fecha_efectiva?: string
    numero_semestres_cursados?: number
    reingreso_posible?: boolean
  }): Promise<Baja> =>
    apiClient.post('/bajas', data).then(r => r.data.data),

  getBajasAlumno: (alumnoId: string): Promise<Baja[]> =>
    apiClient.get(`/alumnos/${alumnoId}/bajas`).then(r => r.data.data),
}
