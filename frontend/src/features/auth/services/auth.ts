import apiClient from '../../../config/apiClient'

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  roles: string[]
  permissions?: string[]
  // campos extra para rol alumno
  numero_control?: string
  carrera?: string
  semestre?: number
  estatus?: string
  pendiente_certificado_bachillerato?: boolean
  periodo_ingreso?: string
  observaciones_estatus?: string | null
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/auth/login', payload)
    return data.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  me: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get('/auth/me')
    return data.data
  },

  forgotPassword: async (identifier: string): Promise<{ destino: string }> => {
    const { data } = await apiClient.post('/auth/forgot-password', { identifier })
    return data.data
  },

  resetPassword: async (payload: { token: string; email: string; password: string; password_confirmation: string }): Promise<void> => {
    await apiClient.post('/auth/reset-password', payload)
  },
}
