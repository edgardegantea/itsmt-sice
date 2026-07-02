import apiClient from '../../../config/apiClient'

export interface TipoSolicitudPersonal {
  id: string
  nombre: string
  documentos_requeridos: string[]
}

export interface SolicitudPersonal {
  id: string
  solicitante_id: string
  tipo_id: string
  fecha_inicio: string
  fecha_fin: string
  motivo: string
  estatus: 'pendiente' | 'aprobada' | 'rechazada'
  observaciones?: string
  atendida_por?: { id: string; name: string; email: string }
  solicitante?: { id: string; name: string; email: string }
  tipo?: TipoSolicitudPersonal
  created_at: string
}

export interface Comision {
  id: string
  personal_id: string
  destino: string
  proposito: string
  fecha_inicio: string
  fecha_fin: string
  con_viaticos: boolean
  monto_viaticos?: number
  asignada_por: string
  asignadaPor?: { id: string; name: string }
  personal?: { id: string; name: string }
  created_at: string
}

export interface HistorialPersonal {
  solicitudes: SolicitudPersonal[]
  comisiones: Comision[]
}

export interface SolicitudParams {
  tipo_id: string
  fecha_inicio: string
  fecha_fin: string
  motivo: string
  documentos?: string[]
}

export const personalService = {
  getTipos: () => apiClient.get<TipoSolicitudPersonal[]>('/tipos-solicitud-personal'),

  getSolicitudes: (params?: Record<string, string>) =>
    apiClient.get('/solicitudes-personal', { params }),

  crearSolicitud: (data: SolicitudParams) =>
    apiClient.post('/solicitudes-personal', data),

  resolverSolicitud: (
    id: string,
    estatus: 'aprobada' | 'rechazada',
    observaciones?: string
  ) => apiClient.patch(`/solicitudes-personal/${id}/resolver`, { estatus, observaciones }),

  descargarPermisoPdf: (id: string) =>
    apiClient.get(`/solicitudes-personal/${id}/documento/pdf`, { responseType: 'blob' }),

  getHistorial: (personalId: string) =>
    apiClient.get<HistorialPersonal>(`/personal/${personalId}/historial`),

  getComisiones: (params?: Record<string, string>) =>
    apiClient.get('/comisiones', { params }),

  crearComision: (data: Omit<Comision, 'id' | 'asignada_por' | 'created_at' | 'asignadaPor' | 'personal'>) =>
    apiClient.post('/comisiones', data),

  descargarOficioPdf: (id: string) =>
    apiClient.get(`/comisiones/${id}/oficio/pdf`, { responseType: 'blob' }),
}
