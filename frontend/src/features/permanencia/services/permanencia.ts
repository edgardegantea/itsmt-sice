import apiClient from '../../../config/apiClient'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EstatusReinscripcion = 'pendiente' | 'aprobada' | 'rechazada'
export type TipoConstancia = 'estudios' | 'inscripcion' | 'calificaciones'
export type TipoBaja = 'parcial' | 'temporal' | 'definitiva'

export interface Vehiculo { tipo: string; marca: string; anio: number }
export interface GastosMensuales {
  luz?: number; agua?: number; tel_fija?: number; tel_celular?: number
  internet?: number; tv_cable?: number; renta?: number; transporte?: number
  material_escolar?: number; salud?: number; alimentacion?: number; otros?: number
}

export interface EncuestaSocioeconomica {
  id?: string
  alumno_id?: string
  periodo_id: string
  semestre: number
  // Fase 1 — Datos personales
  foto_infantil_path?: string | null
  foto_infantil_url?: string | null
  dp_curp?: string | null
  dp_fecha_nacimiento?: string | null
  dp_lugar_nacimiento?: string | null
  dp_sexo?: string | null
  dp_estado_civil?: string | null
  dp_telefono?: string | null
  dp_email?: string | null
  dp_municipio_procedencia?: string | null
  dp_escuela_bachillerato?: string | null
  // I
  con_quien_vive?: string
  tiene_beca?: boolean
  beca?: string
  ingreso_propio?: string
  // III Padre
  padre_nivel_educativo?: string
  padre_situacion_laboral?: string
  padre_ocupacion?: string
  padre_centro_trabajo?: string
  padre_cargo?: string
  padre_tiempo_servicio?: string
  padre_ingresos_mensuales?: number
  padre_otros_ingresos?: string
  // IV Madre
  madre_nivel_educativo?: string
  madre_situacion_laboral?: string
  madre_ocupacion?: string
  madre_centro_trabajo?: string
  madre_cargo?: string
  madre_tiempo_servicio?: string
  madre_ingresos_mensuales?: number
  madre_otros_ingresos?: string
  // V Familia
  familia_total_integrantes?: number
  familia_num_hijos?: number
  familia_edades_hijos?: string
  familia_num_estudiantes?: number
  // VI Vivienda
  vivienda_calle?: string
  vivienda_numero?: string
  vivienda_colonia?: string
  vivienda_municipio?: string
  vivienda_tipo?: string
  vivienda_tipo_propiedad?: string
  vivienda_otras_propiedades?: string
  tiene_vehiculo?: boolean
  vehiculos?: Vehiculo[]
  traslado_escuela?: string
  total_ingresos_familia?: number
  otros_ingresos_familia?: number
  gastos_mensuales?: GastosMensuales
  total_egresos_familia?: number
  // VII Salud
  salud_estado?: string
  salud_problema_familiar?: boolean
  salud_especifique?: string
  // VIII
  informacion_adicional?: string
  enviada_at?: string | null
  updated_at?: string
}

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
  alumno_id: string
  concepto: string
  monto: string
  pagado: boolean
  alumno?: { numero_control: string; user?: { name: string }; carrera?: { nombre: string; clave: string } }
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

  getAdeudosAdmin: (params?: Record<string, string>): Promise<any> =>
    apiClient.get('/adeudos', { params }).then(r => r.data.data),

  crearAdeudo: (data: { alumno_id: string; concepto: string; monto: number }): Promise<Adeudo> =>
    apiClient.post('/adeudos', data).then(r => r.data.data),

  marcarAdeudoPagado: (id: string): Promise<Adeudo> =>
    apiClient.patch(`/adeudos/${id}/pagar`, {}).then(r => r.data.data),

  eliminarAdeudo: (id: string): Promise<void> =>
    apiClient.delete(`/adeudos/${id}`).then(() => undefined),

  // Bajas admin
  getBajas: (params?: Record<string, string>): Promise<any> =>
    apiClient.get('/bajas', { params }).then(r => r.data.data),

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

  getMisBajas: (): Promise<Baja[]> =>
    apiClient.get('/bajas/mias').then(r => r.data.data),

  solicitarBajaTemporal: (data: {
    periodo_id: string
    fecha_solicitud: string
    motivo_texto?: string
    numero_semestres_cursados?: number
  }): Promise<Baja> =>
    apiClient.post('/bajas/solicitar', data).then(r => r.data.data),

  // Encuesta Socioeconómica
  getMiEncuesta: (periodoId?: string): Promise<{ encuesta: EncuestaSocioeconomica | null; periodo: any; alumno: any }> =>
    apiClient.get('/encuestas-socioeconomicas/mi-encuesta', { params: periodoId ? { periodo_id: periodoId } : {} }).then(r => r.data.data),

  guardarEncuesta: (data: Partial<EncuestaSocioeconomica>, foto?: File | null): Promise<EncuestaSocioeconomica> => {
    const fd = new FormData()
    const jsonFields: Array<keyof EncuestaSocioeconomica> = ['vehiculos', 'gastos_mensuales']
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined || v === null) continue
      if (jsonFields.includes(k as keyof EncuestaSocioeconomica)) {
        fd.append(k, JSON.stringify(v))
      } else if (typeof v === 'boolean') {
        fd.append(k, v ? '1' : '0')
      } else {
        fd.append(k, String(v))
      }
    }
    if (foto) fd.append('foto_infantil', foto)
    return apiClient.post('/encuestas-socioeconomicas', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data)
  },

  enviarEncuesta: (id: string): Promise<EncuestaSocioeconomica> =>
    apiClient.post(`/encuestas-socioeconomicas/${id}/enviar`, {}).then(r => r.data.data),

  getEncuestas: (params?: Record<string, string>): Promise<any> =>
    apiClient.get('/admin/encuestas-socioeconomicas', { params }).then(r => r.data.data),

  getEncuesta: (id: string): Promise<EncuestaSocioeconomica> =>
    apiClient.get(`/admin/encuestas-socioeconomicas/${id}`).then(r => r.data.data),
}
