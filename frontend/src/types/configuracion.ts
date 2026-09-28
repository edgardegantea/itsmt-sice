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
  fecha_inicio_actualizacion_datos: string | null
  fecha_fin_actualizacion_datos: string | null
  login_titulo: string | null
  login_subtitulo: string | null
  login_imagen_fondo: string | null
  login_opacidad_fondo: number
  url_logo_principal: string | null
  url_logo_secundario: string | null
  url_login_imagen_fondo: string | null
  logo_base64: string | null
  maestria_habilitada?: boolean
  recordatorios_asistencia_global_activo?: boolean
  form_border_radius?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  form_density?: 'compact' | 'comfortable' | 'spacious'
  form_bg_style?: 'white' | 'slate' | 'glass' | 'tint'
  form_focus_ring_color?: string
  form_border_tone?: 'slate-200' | 'slate-300' | 'primary-tint' | 'dark'
  form_label_weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  aviso_banner_mensaje?: string | null
  aviso_banner_tipo?: 'info' | 'warning' | 'danger' | 'success'
  aviso_banner_activo?: boolean
}
