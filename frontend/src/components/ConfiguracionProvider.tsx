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
  }, [config.color_primario, config.color_secundario])

  useEffect(() => {
    applyFont(config.fuente_interfaz ?? DEFAULT_FONT)
  }, [config.fuente_interfaz])

  useEffect(() => {
    if (config.nombre_corto) {
      document.title = `${config.nombre_corto} — Control Escolar`
    }
  }, [config.nombre_corto])

  return null
}
