import apiClient from '../../../config/apiClient'

export interface ComunicadoItem {
  id: string
  titulo: string
  contenido: string
  resumen?: string | null
  prioridad: 'baja' | 'normal' | 'alta' | 'urgente'
  categoria: 'general' | 'academico' | 'administrativo' | 'sindical' | 'urgente' | 'evento'
  destinatario_rol?: string | null
  carrera_id?: string | null
  carrera?: { id: string; nombre: string; clave: string } | null
  fijado: boolean
  requiere_confirmacion: boolean
  publicado_at: string
  expira_at?: string | null
  publicado_por_id: string
  publicado_por?: { id: string; name: string; email?: string } | null
  activo: boolean
  leido?: boolean
  lecturas?: any[]
  lecturas_count?: number
}

export interface ComunicadosPaginados {
  data: ComunicadoItem[]
  current_page: number
  last_page: number
  total: number
  no_leidos: number
}

export const comunicadosApi = {
  getComunicados: (params?: { categoria?: string; prioridad?: string; page?: number }) =>
    apiClient.get('/comunicados', { params }).then(r => r.data.data as ComunicadosPaginados),

  getComunicadosAdmin: (params?: { categoria?: string; activo?: boolean; page?: number }) =>
    apiClient.get('/comunicados/admin/gestion', { params }).then(r => r.data.data),

  getComunicado: (id: string) =>
    apiClient.get(`/comunicados/${id}`).then(r => r.data.data as ComunicadoItem),

  crearComunicado: (data: Partial<ComunicadoItem>) =>
    apiClient.post('/comunicados', data).then(r => r.data.data as ComunicadoItem),

  actualizarComunicado: (id: string, data: Partial<ComunicadoItem>) =>
    apiClient.patch(`/comunicados/${id}`, data).then(r => r.data.data as ComunicadoItem),

  eliminarComunicado: (id: string) =>
    apiClient.delete(`/comunicados/${id}`),

  marcarLeido: (id: string) =>
    apiClient.post(`/comunicados/${id}/marcar-leido`),

  getIndicadores: () =>
    apiClient.get('/comunicados/indicadores').then(r => r.data.data as {
      total_activos: number
      fijados: number
      urgentes_activos: number
      lecturas_totales: number
    }),
}
