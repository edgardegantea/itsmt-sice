import apiClient from '../../../config/apiClient'

export interface NotificacionItem {
  id: string
  user_id: string
  titulo: string
  mensaje: string
  tipo: string
  link?: string | null
  leida: boolean
  created_at: string
  updated_at: string
}

export interface NotificacionesResponse {
  data: NotificacionItem[]
  no_leidas: number
}

export const notificacionesApi = {
  getNotificaciones: async (): Promise<NotificacionesResponse> => {
    const response = await apiClient.get<NotificacionesResponse>('/notificaciones')
    return response.data
  },

  marcarLeida: async (id: string): Promise<void> => {
    await apiClient.patch(`/notificaciones/${id}/marcar-leida`)
  },

  marcarTodasLeidas: async (): Promise<void> => {
    await apiClient.post('/notificaciones/marcar-todas-leidas')
  },
}
