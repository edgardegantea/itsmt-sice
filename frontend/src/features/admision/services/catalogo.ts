import apiClient from '../../../config/apiClient'

export interface Estado   { id: number; nombre: string; clave_curp: string; municipios_count?: number }
export interface Municipio { id: number; nombre: string; estado_id: number; estado?: Estado; escuelas_count?: number }
export interface EscuelaBachillerato { id: number; nombre: string; tipo: string; municipio_id: number | null; municipio?: Municipio; activa: boolean }
export interface Turno    { id: number; nombre: string; clave: string; activo: boolean }

export const catalogoPublico = {
  getEstados:    ()             => apiClient.get('/catalogo/estados').then(r => r.data.data as Estado[]),
  getMunicipios:   (estado_id?: number) => apiClient.get('/catalogo/municipios', { params: { estado_id } }).then(r => r.data.data as Municipio[]),
  crearMunicipio:  (data: { nombre: string; estado_id?: number | null }) =>
    apiClient.post('/catalogo/municipios', data).then(r => r.data.data as Municipio),
  crearEscuela:    (data: { nombre: string; municipio_id?: number | null }) =>
    apiClient.post('/catalogo/escuelas', data).then(r => r.data.data as EscuelaBachillerato),
  getEscuelas:   (params?: { municipio_id?: number; estado_id?: number }) =>
    apiClient.get('/catalogo/escuelas', { params }).then(r => r.data.data as EscuelaBachillerato[]),
  getTurnos:     ()             => apiClient.get('/catalogo/turnos').then(r => r.data.data as Turno[]),
  verificarCurp:    (curp: string) => apiClient.get(`/catalogo/verificar-curp/${curp}`).then(r => r.data.data as { registrado: boolean; estatus?: string; periodo?: string }),
  consultarRenapo:  (curp: string) => apiClient.get(`/catalogo/renapo/${curp}`).then(r => r.data.data as {
    nombres?:          string | null
    apellido_paterno?: string | null
    apellido_materno?: string | null
    fecha_nacimiento?: string | null
    sexo?:             string | null
    estado_nacimiento?:string | null
    fuente:            'renapo' | 'curp'
  }),
}

export const catalogoAdmin = {
  // Estados
  getEstados:      ()                           => apiClient.get('/admin/catalogos/estados').then(r => r.data.data as Estado[]),
  crearEstado:     (d: Partial<Estado>)         => apiClient.post('/admin/catalogos/estados', d).then(r => r.data.data as Estado),
  actualizarEstado:(id: number, d: Partial<Estado>) => apiClient.patch(`/admin/catalogos/estados/${id}`, d).then(r => r.data.data as Estado),
  eliminarEstado:  (id: number)                 => apiClient.delete(`/admin/catalogos/estados/${id}`),

  // Municipios
  getMunicipios:      (estado_id?: number)              => apiClient.get('/admin/catalogos/municipios', { params: { estado_id } }).then(r => r.data.data as Municipio[]),
  crearMunicipio:     (d: Partial<Municipio>)           => apiClient.post('/admin/catalogos/municipios', d).then(r => r.data.data as Municipio),
  actualizarMunicipio:(id: number, d: Partial<Municipio>) => apiClient.patch(`/admin/catalogos/municipios/${id}`, d).then(r => r.data.data as Municipio),
  eliminarMunicipio:  (id: number)                      => apiClient.delete(`/admin/catalogos/municipios/${id}`),

  // Escuelas
  getEscuelas:       (params?: { municipio_id?: number; estado_id?: number }) =>
    apiClient.get('/admin/catalogos/escuelas', { params }).then(r => r.data.data as EscuelaBachillerato[]),
  crearEscuela:      (d: Partial<EscuelaBachillerato>)           => apiClient.post('/admin/catalogos/escuelas', d).then(r => r.data.data as EscuelaBachillerato),
  actualizarEscuela: (id: number, d: Partial<EscuelaBachillerato>) => apiClient.patch(`/admin/catalogos/escuelas/${id}`, d).then(r => r.data.data as EscuelaBachillerato),
  eliminarEscuela:   (id: number)                                => apiClient.delete(`/admin/catalogos/escuelas/${id}`),

  // Turnos
  getTurnos:      ()                        => apiClient.get('/admin/catalogos/turnos').then(r => r.data.data as Turno[]),
  crearTurno:     (d: Partial<Turno>)       => apiClient.post('/admin/catalogos/turnos', d).then(r => r.data.data as Turno),
  actualizarTurno:(id: number, d: Partial<Turno>) => apiClient.patch(`/admin/catalogos/turnos/${id}`, d).then(r => r.data.data as Turno),
  eliminarTurno:  (id: number)              => apiClient.delete(`/admin/catalogos/turnos/${id}`),
}
