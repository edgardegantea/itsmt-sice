import apiClient from '../../../config/apiClient'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TipoActividad {
  id: string
  clave: string
  nombre: string
  horas_requeridas: number
}

export type EstatusActividad = 'registrada' | 'validada' | 'rechazada'
export type NivelDesempeno = 'excelente' | 'notable' | 'bueno' | 'suficiente' | 'insuficiente'

export interface ActividadComplementaria {
  id: string
  alumno_id: string
  tipo_id: string
  tipo: TipoActividad
  horas: number
  evidencia_url: string | null
  estatus: EstatusActividad
  nivel_desempeno: NivelDesempeno | null
  semestre_alumno_al_registrar: number
  observaciones_validacion: string | null
  validado_por: string | null
  alumno?: { user: { name: string }; numero_control: string; carrera: { nombre: string } }
  created_at: string
}

export interface GrupoEvaluacion {
  grupo_id: string
  clave: string
  semestre: number
  materias: { materia: string | null; docente: string | null }[]
  ya_evaluado: boolean
}

export interface ResultadoEvaluacion {
  grupo_id: string
  clave: string
  carrera: string | null
  docentes: string[]
  total_respuestas: number
  promedios: Record<string, number | null>
}

// ── API ───────────────────────────────────────────────────────────────────────

export const calidadApi = {
  // Tipos de actividad
  getTiposActividad: async (): Promise<TipoActividad[]> => {
    const res = await apiClient.get('/tipos-actividad')
    return res.data.data
  },

  // Actividades complementarias
  getActividades: async (params?: Record<string, string>): Promise<any> => {
    const res = await apiClient.get('/actividades-complementarias', { params })
    return res.data.data
  },

  registrarActividad: async (data: {
    tipo_id: string
    horas: number
    evidencia_url?: string
  }): Promise<ActividadComplementaria> => {
    const res = await apiClient.post('/actividades-complementarias', data)
    return res.data.data
  },

  eliminarActividad: async (id: string): Promise<void> => {
    await apiClient.delete(`/actividades-complementarias/${id}`)
  },

  subirEvidencia: async (id: string, file: File): Promise<{ evidencia_url: string }> => {
    const form = new FormData()
    form.append('evidencia', file)
    const res = await apiClient.post(`/actividades-complementarias/${id}/evidencia`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },

  validarActividad: async (
    id: string,
    data: {
      estatus: 'validada' | 'rechazada'
      nivel_desempeno?: NivelDesempeno
      observaciones_validacion?: string
    }
  ): Promise<ActividadComplementaria> => {
    const res = await apiClient.patch(`/actividades-complementarias/${id}/validar`, data)
    return res.data.data
  },

  // Evaluaciones docentes
  getGruposParaEvaluar: async (): Promise<GrupoEvaluacion[]> => {
    const res = await apiClient.get('/evaluaciones-docentes')
    return res.data.data
  },

  enviarEvaluacion: async (data: {
    grupo_id: string
    respuestas: Record<string, number>
  }): Promise<void> => {
    await apiClient.post('/evaluaciones-docentes', data)
  },

  getResultadosEvaluacion: async (params?: {
    periodo_id?: string
    carrera_id?: string
  }): Promise<ResultadoEvaluacion[]> => {
    const res = await apiClient.get('/evaluaciones-docentes/resultados', { params })
    return res.data.data
  },
}
