import apiClient from '../../../config/apiClient'

// ── Tipos ─────────────────────────────────────────────────────────────────────

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
  createMateria: (d: Partial<Materia>) =>
    apiClient.post('/materias', d).then(r => r.data.data as Materia),
  updateMateria: (id: string, d: Partial<Materia>) =>
    apiClient.patch(`/materias/${id}`, d).then(r => r.data.data as Materia),
  deleteMateria: (id: string) =>
    apiClient.delete(`/materias/${id}`),

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

  // Horarios
  getHorarios: (params?: Record<string, string>) =>
    apiClient.get('/horarios', { params }).then(r => r.data.data as Horario[]),
  verificarConflictos: (params: { carga_academica_id: string; dia_semana: string; hora_inicio: string; hora_fin: string; excluir_horario_id?: string }) =>
    apiClient.get('/horarios/conflictos', { params }).then(r => r.data.data as { conflictos: { tipo: string; mensaje: string }[]; tiene_conflictos: boolean }),
  saveHorarios: (carga_academica_id: string, bloques: { dia_semana: string; hora_inicio: string; hora_fin: string }[]) =>
    apiClient.post('/horarios', { carga_academica_id, bloques }).then(r => r.data.data as Horario[]),
  deleteHorario: (id: string) =>
    apiClient.delete(`/horarios/${id}`),

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
}
