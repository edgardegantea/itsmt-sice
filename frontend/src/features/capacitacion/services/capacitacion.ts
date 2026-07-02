import apiClient from '../../../config/apiClient'

export interface CursoCapacitacion {
  id: string
  nombre: string
  tipo: 'formacion_docente' | 'actualizacion_profesional'
  modalidad: 'presencial' | 'distancia' | 'mixto'
  origen: 'interno' | 'externo'
  instructor: string
  periodo_inicio: string
  periodo_fin: string
  horas_totales: number
  horario?: string
  clave_registro_tecnm?: string
  estatus: 'planeado' | 'en_curso' | 'finalizado' | 'cancelado'
  jefe_depto_id: string
  jefeDepto?: { id: string; name: string }
  cedulas_count?: number
  created_at: string
}

export interface CedulaInscripcion {
  id: string
  curso_id: string
  usuario_id: string
  rfc: string
  curp: string
  sexo: 'H' | 'M'
  grado_maximo_estudios: string
  nombre_carrera: string
  area_adscripcion: string
  puesto: string
  clave_presupuestal: string
  jefe_inmediato: string
  telefono_oficial: string
  horario_laboral: string
  ext?: string
  estatus: 'inscrito' | 'completado' | 'acreditado' | 'no_acreditado'
  calificacion?: number
  num_asistencias: number
  usuario?: { id: string; name: string; email: string }
  curso?: CursoCapacitacion
  created_at: string
}

export interface DatosCedula {
  rfc: string
  curp: string
  sexo: 'H' | 'M'
  grado_maximo_estudios: string
  nombre_carrera: string
  area_adscripcion: string
  puesto: string
  clave_presupuestal: string
  jefe_inmediato: string
  telefono_oficial: string
  horario_laboral: string
  ext?: string
}

export interface CursoParams {
  nombre: string
  tipo: 'formacion_docente' | 'actualizacion_profesional'
  modalidad: 'presencial' | 'distancia' | 'mixto'
  origen: 'interno' | 'externo'
  instructor: string
  periodo_inicio: string
  periodo_fin: string
  horas_totales: number
  horario?: string
  clave_registro_tecnm?: string
}

export const capacitacionService = {
  getCursos: (params?: Record<string, string>) =>
    apiClient.get('/cursos-capacitacion', { params }),

  crearCurso: (data: CursoParams) =>
    apiClient.post('/cursos-capacitacion', data),

  actualizarCurso: (id: string, data: Partial<CursoCapacitacion>) =>
    apiClient.patch(`/cursos-capacitacion/${id}`, data),

  getInscritos: (cursoId: string) =>
    apiClient.get<CedulaInscripcion[]>(`/cursos-capacitacion/${cursoId}/inscripciones`),

  inscribirse: (cursoId: string, datos: DatosCedula) =>
    apiClient.post(`/cursos-capacitacion/${cursoId}/inscripciones`, datos),

  descargarCedulaPdf: (cedulaId: string) =>
    apiClient.get(`/cedulas-inscripcion/${cedulaId}/pdf`, { responseType: 'blob' }),
}
