import apiClient from '../../../config/apiClient'

export interface DesercionRow {
  carrera_id: string
  carrera: string
  periodo_id: string
  periodo: string
  total_inscritos: number
  total_desertores: number
  porcentaje_desercion: number
}

export interface RetencionRow {
  carrera_id: string
  periodo_anterior_id: string
  periodo_anterior: string
  periodo_actual_id: string
  periodo_actual: string
  inscritos_periodo_ant: number
  inscritos_periodo_act: number
  porcentaje_retencion: number
}

export interface EficienciaTerminalRow {
  carrera_id: string
  carrera: string
  generacion: number
  total_ingreso: number
  total_egresados: number
  total_titulados: number
  pct_eficiencia: number
}

export interface PromedioRow {
  carrera_id: string
  carrera: string
  periodo_id: string
  periodo: string
  promedio_general: number
  total_calificaciones: number
}

export interface IndicadoresParams {
  carrera_id?: string
  periodo_id?: string
  generacion?: number | string
}

export const analiticaService = {
  getDesercion: (params?: IndicadoresParams) =>
    apiClient.get<{ data: DesercionRow[] }>('/indicadores/desercion', { params }),

  getRetencion: (params?: IndicadoresParams) =>
    apiClient.get<{ data: RetencionRow[] }>('/indicadores/retencion', { params }),

  getEficienciaTerminal: (params?: IndicadoresParams) =>
    apiClient.get<{ data: EficienciaTerminalRow[] }>('/indicadores/eficiencia-terminal', { params }),

  getPromedio: (params?: IndicadoresParams) =>
    apiClient.get<{ data: PromedioRow[] }>('/indicadores/promedio', { params }),
}
