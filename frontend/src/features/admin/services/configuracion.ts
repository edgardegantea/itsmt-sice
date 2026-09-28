import apiClient from '../../../config/apiClient'

export type { ConfiguracionInstitucional } from '@/types/configuracion'
import type { ConfiguracionInstitucional } from '@/types/configuracion'

export const configuracionApi = {
  get: (): Promise<ConfiguracionInstitucional> =>
    apiClient.get('/configuracion').then(r => r.data.data),

  update: (data: Partial<Omit<ConfiguracionInstitucional, 'id' | 'url_logo_principal' | 'url_logo_secundario' | 'url_login_imagen_fondo' | 'logo_base64'>>): Promise<ConfiguracionInstitucional> =>
    apiClient.patch('/admin/configuracion', data).then(r => r.data.data),

  subirLogo: (file: File, tipo: 'principal' | 'secundario' | 'fondo'): Promise<{ path: string; url: string }> => {
    const fd = new FormData()
    fd.append('logo', file)
    fd.append('tipo', tipo)
    return apiClient.post('/admin/configuracion/logo', fd).then(r => r.data.data)
  },

  eliminarLogo: (tipo: 'principal' | 'secundario' | 'fondo'): Promise<void> =>
    apiClient.delete('/admin/configuracion/logo', { data: { tipo } }).then(() => undefined),

  toggleRecordatoriosAsistencia: (activo: boolean): Promise<{ recordatorios_asistencia_global_activo: boolean }> =>
    apiClient.patch('/admin/configuracion/recordatorios-asistencia', { recordatorios_asistencia_global_activo: activo })
      .then(r => r.data.data),
}
