import { useEffect } from 'react'
import { useConfiguracion } from '../hooks/useConfiguracion'
import { applyFont, DEFAULT_FONT } from '../config/fonts'

export default function ConfiguracionProvider() {
  const { config } = useConfiguracion()

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-primario',      config.color_primario)
    root.style.setProperty('--color-secundario',    config.color_secundario)
    root.style.setProperty('--color-primario-hover', config.color_primario + 'dd')
    root.style.setProperty('--color-acento',        (config as any).color_acento ?? '#f59e0b')
    root.style.setProperty('--color-sidebar-user',  (config as any).color_sidebar || config.color_primario)
    const radiusMap: Record<string, string> = {
      cuadrado:   '0px',
      moderado:   '6px',
      redondeado: '12px',
      pill:       '9999px',
    }
    root.style.setProperty('--radio-bordes', radiusMap[(config as any).radio_bordes ?? 'redondeado'] ?? '12px')
  }, [config.color_primario, config.color_secundario, (config as any).color_acento, (config as any).color_sidebar, (config as any).radio_bordes])

  useEffect(() => {
    applyFont((config as any).fuente_interfaz ?? DEFAULT_FONT)
  }, [(config as any).fuente_interfaz])

  useEffect(() => {
    if (config.nombre_corto) {
      document.title = `${config.nombre_corto} — Control Escolar`
    }
  }, [config.nombre_corto])

  return null
}
