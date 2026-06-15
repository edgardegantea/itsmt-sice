import apiClient from '../../../config/apiClient'

export interface ConfiguracionInstitucional {
  id: number
  nombre_institucion: string
  nombre_corto: string
  clave_tecnm: string | null
  dependencia: string | null
  subsistema: string | null
  direccion: string | null
  ciudad: string | null
  estado: string | null
  cp: string | null
  telefono: string | null
  email_institucional: string | null
  sitio_web: string | null
  logo_principal: string | null
  logo_secundario: string | null
  color_primario: string
  color_secundario: string
  subdirector_academico: string | null
  responsable_servicios_escolares: string | null
  fuente_interfaz: string
  url_logo_principal: string | null
  url_logo_secundario: string | null
  logo_base64: string | null
}

export const configuracionApi = {
  get: (): Promise<ConfiguracionInstitucional> =>
    apiClient.get('/configuracion').then(r => r.data.data),

  update: (data: Partial<Omit<ConfiguracionInstitucional, 'id' | 'url_logo_principal' | 'url_logo_secundario'>>): Promise<ConfiguracionInstitucional> =>
    apiClient.patch('/admin/configuracion', data).then(r => r.data.data),

  subirLogo: (file: File, tipo: 'principal' | 'secundario'): Promise<{ path: string; url: string }> => {
    const fd = new FormData()
    fd.append('logo', file)
    fd.append('tipo', tipo)
    return apiClient.post('/admin/configuracion/logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data)
  },

  eliminarLogo: (tipo: 'principal' | 'secundario'): Promise<void> =>
    apiClient.delete('/admin/configuracion/logo', { data: { tipo } }).then(() => undefined),
}
