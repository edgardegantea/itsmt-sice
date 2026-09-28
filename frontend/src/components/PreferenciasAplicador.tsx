import { useEffect } from 'react'
import { usePreferenciasStore, SIDEBAR_COLORS } from '../store/preferenciasStore'

export default function PreferenciasAplicador() {
  const {
    tema, densidad, escalaTexto, colorSidebar,
    altoContraste, reducirMovimiento, textoEspaciado, focusRealzado, subrayarEnlaces,
  } = usePreferenciasStore()

  // Tema (claro/oscuro/sistema) — cuando es "sistema" se sigue la preferencia del SO y se
  // reacciona en vivo si el usuario la cambia sin recargar la página.
  useEffect(() => {
    const html = document.documentElement
    const mql = window.matchMedia('(prefers-color-scheme: dark)')

    const aplicar = () => {
      const efectivo = tema === 'sistema' ? (mql.matches ? 'oscuro' : 'claro') : tema
      html.setAttribute('data-tema', efectivo)
    }
    aplicar()

    if (tema === 'sistema') {
      mql.addEventListener('change', aplicar)
      return () => mql.removeEventListener('change', aplicar)
    }
  }, [tema])

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
