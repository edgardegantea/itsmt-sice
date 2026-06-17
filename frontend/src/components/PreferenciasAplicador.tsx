import { useEffect } from 'react'
import { usePreferenciasStore, SIDEBAR_COLORS } from '../store/preferenciasStore'

export default function PreferenciasAplicador() {
  const {
    densidad, escalaTexto, colorSidebar,
    altoContraste, reducirMovimiento, textoEspaciado, focusRealzado, subrayarEnlaces,
  } = usePreferenciasStore()

  useEffect(() => {
    const html = document.documentElement

    // Visualización
    html.setAttribute('data-density',  densidad)
    html.setAttribute('data-escala',   escalaTexto)
    html.style.setProperty('--color-sidebar-user', SIDEBAR_COLORS[colorSidebar].bg)

    // Accesibilidad — data-attributes usados por index.css
    html.toggleAttribute('data-alto-contraste',     altoContraste)
    html.toggleAttribute('data-reducir-movimiento', reducirMovimiento)
    html.toggleAttribute('data-texto-espaciado',    textoEspaciado)
    html.toggleAttribute('data-focus-realzado',     focusRealzado)
    html.toggleAttribute('data-subrayar-enlaces',   subrayarEnlaces)
  }, [densidad, escalaTexto, colorSidebar, altoContraste, reducirMovimiento, textoEspaciado, focusRealzado, subrayarEnlaces])

  return null
}
