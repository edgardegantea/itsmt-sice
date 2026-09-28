import { useEffect } from 'react'
import { useConfiguracion } from '../hooks/useConfiguracion'
import { applyFont, DEFAULT_FONT } from '../config/fonts'

export default function ConfiguracionProvider() {
  const { config } = useConfiguracion()

  useEffect(() => {
    const root = document.documentElement
    const primario = config.color_primario || '#1b396a'
    const secundario = config.color_secundario || '#8b1d41'
    const focusRing = config.form_focus_ring_color || primario

    root.style.setProperty('--color-primario',       primario)
    root.style.setProperty('--color-secundario',     secundario)
    root.style.setProperty('--color-primario-hover', primario + 'dd')
    root.style.setProperty('--color-dorado-tecnm',   '#b38e5d')

    // Form Customization CSS custom properties
    const radiusMap: Record<string, string> = {
      sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '1.25rem',
    }
    const paddingMap: Record<string, string> = {
      compact: '0.375rem 0.625rem', comfortable: '0.5rem 0.875rem', spacious: '0.75rem 1rem',
    }
    const fontSizeMap: Record<string, string> = {
      compact: '0.8125rem', comfortable: '0.875rem', spacious: '0.9375rem',
    }
    const bgStyleMap: Record<string, string> = {
      white: '#ffffff', slate: '#f8fafc', glass: 'rgba(255, 255, 255, 0.88)', tint: 'rgba(27, 57, 106, 0.03)',
    }
    const borderToneMap: Record<string, string> = {
      'slate-200': '#e2e8f0', 'slate-300': '#cbd5e1', 'primary-tint': 'rgba(27, 57, 106, 0.3)', 'dark': '#64748b',
    }
    const labelWeightMap: Record<string, string> = {
      normal: '400', medium: '500', semibold: '600', bold: '700',
    }

    root.style.setProperty('--form-radius',        radiusMap[config.form_border_radius ?? 'lg'] ?? '0.5rem')
    root.style.setProperty('--form-padding',       paddingMap[config.form_density ?? 'comfortable'] ?? '0.5rem 0.875rem')
    root.style.setProperty('--form-font-size',     fontSizeMap[config.form_density ?? 'comfortable'] ?? '0.875rem')
    root.style.setProperty('--form-bg',            bgStyleMap[config.form_bg_style ?? 'white'] ?? '#ffffff')
    root.style.setProperty('--form-border-color',  borderToneMap[config.form_border_tone ?? 'slate-200'] ?? '#e2e8f0')
    root.style.setProperty('--form-focus-color',   focusRing)
    root.style.setProperty('--form-label-weight',  labelWeightMap[config.form_label_weight ?? 'medium'] ?? '500')
  }, [
    config.color_primario,
    config.color_secundario,
    config.form_border_radius,
    config.form_density,
    config.form_bg_style,
    config.form_focus_ring_color,
    config.form_border_tone,
    config.form_label_weight,
  ])

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
