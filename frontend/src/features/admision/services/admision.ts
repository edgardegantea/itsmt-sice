import apiClient from '../../../config/apiClient'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Carrera {
  id: string
  nombre: string
  clave: string
  activa: boolean
}

export interface Periodo {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  activo: boolean
  tipo: 'ordinario' | 'verano' | 'intersemestral'
  aspirantes_count?: number
  inscripciones_count?: number
  fecha_limite_baja_parcial?: string | null
}

export type EstatusAspirante = 'pendiente' | 'aceptado' | 'rechazado' | 'inscrito'

export interface Aspirante {
  id: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string | null
  curp: string
  fecha_nacimiento: string
  sexo: 'masculino' | 'femenino'
  municipio_procedencia: string
  escuela_bachillerato: string
  promedio_bachillerato: number
  turno_preferido: 'matutino' | 'vespertino'
  email: string
  telefono: string | null
  estatus: EstatusAspirante
  observaciones: string | null
  numero_ficha?: string | null
  carrera: Carrera
  periodo: Periodo
  created_at: string
  inscripcion?: { id: string } | null
  // campos extendidos (disponibles en show / lista)
  estado_civil?: string | null
  folio_exani?: string | null
  puntaje_exani?: number | null
  folio_preinscripcion_tecnm?: string | null
  autorizacion_consulta_expediente?: string | null
}

export interface InscripcionDetalle {
  id: string
  numero_control: string
  tipo_ingreso: string
  semestre_ingreso: number
  fecha_inscripcion: string
  aspirante: {
    nombres: string
    apellido_paterno: string
    apellido_materno: string | null
    curp: string
    fecha_nacimiento: string
    sexo: string
    estado_civil: string | null
    telefono: string | null
    email: string
    municipio_procedencia: string
    escuela_bachillerato: string
    promedio_bachillerato: number
    folio_exani: string | null
    puntaje_exani: number | null
    turno_preferido: string
  }
  carrera: Carrera
  periodo: {
    id: string
    nombre: string
    fecha_inicio: string
    fecha_fin: string
    fecha_limite_baja_parcial?: string | null
  }
}

export interface Inscripcion {
  id: string
  aspirante_id: string
  numero_control: string
  carrera: Carrera
  periodo: Periodo
  fecha_inscripcion: string
}

export type EstatusAlumno = 'activo' | 'baja_temporal' | 'baja_definitiva' | 'egresado' | 'titulado'

export interface Alumno {
  id: string
  inscripcion_id: string
  numero_control: string
  carrera: Carrera
  periodo_ingreso: Periodo
  semestre_actual: number
  estatus: EstatusAlumno
  fecha_cambio_estatus: string | null
  pendiente_certificado_bachillerato: boolean
  autorizacion_consulta_expediente: string
  observaciones_estatus: string | null
  inscripcion?: {
    id: string
    aspirante_id: string
    tipo_ingreso?: string
    fecha_inscripcion?: string
    aspirante: {
      nombres: string
      apellido_paterno: string
      apellido_materno: string | null
      curp: string
      email: string
      telefono: string | null
    }
  }
}

export interface ActualizarAlumnoPayload {
  estatus?: EstatusAlumno
  semestre_actual?: number
  carrera_id?: string
  pendiente_certificado_bachillerato?: boolean
  autorizacion_consulta_expediente?: string
  observaciones_estatus?: string | null
}

export interface RegistrarCobroPayload {
  inscripcion_id: string
  alumno_id: string
  folio_fiscal: string
  rfc_emisor?: string
  nombre_pagador: string
  rfc_pagador?: string
  concepto: string
  importe: number
  sello_digital_cfdi?: string
  numero_certificado_sat?: string
}

export interface ReciboCobro {
  id: string
  inscripcion_id: string
  alumno_id: string
  folio_fiscal: string
  rfc_emisor: string
  nombre_pagador: string
  rfc_pagador: string | null
  concepto: string
  importe: string
  created_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

export interface RegistrarAspirantePayload {
  nombres: string
  apellido_paterno: string
  apellido_materno?: string
  curp: string
  fecha_nacimiento: string
  sexo: string
  municipio_procedencia: string
  escuela_bachillerato: string
  promedio_bachillerato: number
  turno_preferido: string
  email: string
  telefono?: string
  folio_preinscripcion_tecnm?: string
  folio_exani?: string
  puntaje_exani?: number
  carrera_id: string
  periodo_id: string
  // Campos adicionales de admisión
  area_bachillerato: string
  estado_civil: string
  medio_enterado: string
  tiene_equipo_computo: boolean
  campus_preferido?: string
  modalidad_preferida?: string
  constancia_bachillerato: File   // archivo — se enviará como FormData
  documentos?: Record<string, boolean>
}

export interface ActualizarEstatusPayload {
  estatus: EstatusAspirante
  observaciones?: string
}

export interface ActualizarAspirantePayload {
  nombres?: string
  apellido_paterno?: string
  apellido_materno?: string | null
  curp?: string
  fecha_nacimiento?: string
  sexo?: string
  municipio_procedencia?: string
  escuela_bachillerato?: string
  promedio_bachillerato?: number
  turno_preferido?: string
  email?: string
  telefono?: string | null
  folio_preinscripcion_tecnm?: string | null
  folio_exani?: string | null
  puntaje_exani?: number | null
  carrera_id?: string
  periodo_id?: string
  observaciones?: string | null
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const admisionApi = {
  // Públicos
  getCarreras: async (): Promise<Carrera[]> => {
    const { data } = await apiClient.get('/carreras')
    return data.data
  },

  getPeriodoActivo: async (): Promise<Periodo> => {
    const { data } = await apiClient.get('/periodos/activo')
    return data.data
  },

  registrarAspirante: async (payload: RegistrarAspirantePayload): Promise<Aspirante> => {
    const fd = new FormData()
    const { constancia_bachillerato, documentos, ...campos } = payload

    Object.entries(campos).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, String(v))
    })

    if (documentos && typeof documentos === 'object') {
      Object.entries(documentos).forEach(([k, v]) => {
        fd.append(`documentos[${k}]`, String(v))
      })
    }

    if (constancia_bachillerato instanceof File) {
      fd.append('constancia_bachillerato', constancia_bachillerato)
    }

    const { data } = await apiClient.post('/aspirantes', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },

  // Admin
  getPeriodos: async (): Promise<Periodo[]> => {
    const { data } = await apiClient.get('/admin/periodos')
    return data.data
  },

  getAspirantes: async (params: { carrera_id?: string; periodo_id?: string; estatus?: string; puntaje_min?: number; page?: number }): Promise<PaginatedResponse<Aspirante>> => {
    const { data } = await apiClient.get('/aspirantes', { params })
    return data.data
  },

  getAspirante: async (id: string): Promise<Aspirante> => {
    const { data } = await apiClient.get(`/aspirantes/${id}`)
    return data.data
  },

  actualizarAspirante: async (id: string, payload: ActualizarAspirantePayload): Promise<Aspirante> => {
    const { data } = await apiClient.patch(`/aspirantes/${id}`, payload)
    return data.data
  },

  actualizarEstatus: async (id: string, payload: ActualizarEstatusPayload): Promise<Aspirante> => {
    const { data } = await apiClient.patch(`/aspirantes/${id}/estatus`, payload)
    return data.data
  },

  inscribir: async (aspiranteId: string, tipoIngreso = 'nuevo_ingreso'): Promise<Inscripcion> => {
    const { data } = await apiClient.post('/inscripciones', { aspirante_id: aspiranteId, tipo_ingreso: tipoIngreso })
    return data.data
  },

  getInscripcion: async (id: string): Promise<InscripcionDetalle> => {
    const { data } = await apiClient.get(`/inscripciones/${id}`)
    return data.data
  },

  // Alumnos
  getAlumnos: async (params: { carrera_id?: string; estatus?: string; semestre?: number; search?: string; page?: number }): Promise<PaginatedResponse<Alumno>> => {
    const { data } = await apiClient.get('/alumnos', { params })
    return data.data
  },

  getAlumno: async (id: string): Promise<Alumno> => {
    const { data } = await apiClient.get(`/alumnos/${id}`)
    return data.data
  },

  actualizarAlumno: async (id: string, payload: ActualizarAlumnoPayload): Promise<Alumno> => {
    const { data } = await apiClient.patch(`/alumnos/${id}`, payload)
    return data.data
  },

  // S1-11 — Cobros CFDI
  registrarCobro: async (payload: RegistrarCobroPayload): Promise<ReciboCobro> => {
    const { data } = await apiClient.post('/cobros-inscripcion', payload)
    return data.data
  },

  urlReciboPdf: (reciboId: string): string =>
    `/cobros-inscripcion/${reciboId}/recibo/pdf`,

  // S1-12 — Credencial
  urlCredencialPdf: (inscripcionId: string): string =>
    `/inscripciones/${inscripcionId}/credencial/pdf`,

  // S1-13 — Libro de Registro NC
  urlLibroRegistroNc: (): string => `/libro-registro-nc`,
}
