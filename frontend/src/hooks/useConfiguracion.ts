import { useQuery } from '@tanstack/react-query'
import { configuracionApi, type ConfiguracionInstitucional } from '../features/admin/services/configuracion'

const FALLBACK: ConfiguracionInstitucional = {
  id: 1,
  nombre_institucion: 'Instituto Tecnológico Superior de Martínez de la Torre',
  nombre_corto: 'ITSMT',
  clave_tecnm: '30MSU0037C',
  dependencia: 'Tecnológico Nacional de México',
  subsistema: 'Subdirección Académica · Departamento de Servicios Escolares',
  direccion: null,
  ciudad: 'Martínez de la Torre',
  estado: 'Veracruz',
  cp: null,
  telefono: null,
  email_institucional: null,
  sitio_web: null,
  logo_principal: null,
  logo_secundario: null,
  color_primario: '#1a3a5c',
  color_secundario: '#2d6a9f',
  color_acento: '#f59e0b',
  color_sidebar: null,
  radio_bordes: 'redondeado' as const,
  subdirector_academico: null,
  responsable_servicios_escolares: null,
  fuente_interfaz: 'Inter',
  url_logo_principal: null,
  url_logo_secundario: null,
  url_login_imagen_fondo: null,
  logo_base64: null,
  fecha_inicio_actualizacion_datos: null,
  fecha_fin_actualizacion_datos: null,
  login_titulo: null,
  login_subtitulo: null,
  login_imagen_fondo: null,
  login_opacidad_fondo: 0.70,
}

export function useConfiguracion() {
  const { data, isLoading } = useQuery({
    queryKey: ['configuracion'],
    queryFn: configuracionApi.get,
    staleTime: 1000 * 60 * 10, // 10 min — cambia poco
    retry: false,
  })

  return { config: data ?? FALLBACK, isLoading }
}
