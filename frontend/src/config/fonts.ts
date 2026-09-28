export interface FontOption {
  name: string        // valor guardado en BD y nombre de la Google Font
  label: string       // nombre para mostrar en UI
  category: string    // para agrupar
  sample: string      // texto de ejemplo
}

export const FONT_OPTIONS: FontOption[] = [
  { name: 'Noto Sans',    label: 'Noto Sans (Normativa TecNM 2026)', category: 'Institucional', sample: 'Tipografía oficial del TecNM (MIG 2026 §1.3)' },
  { name: 'Montserrat',   label: 'Montserrat (Institucional)',       category: 'Institucional', sample: 'Titulares y firmas de formato' },
  { name: 'Inter',        label: 'Inter',         category: 'Sans-serif',  sample: 'Sistema moderno y legible' },
  { name: 'Roboto',       label: 'Roboto',         category: 'Sans-serif',  sample: 'Clara y neutral' },
  { name: 'Open Sans',    label: 'Open Sans',      category: 'Sans-serif',  sample: 'Optimizada para pantallas' },
  { name: 'Lato',         label: 'Lato',           category: 'Sans-serif',  sample: 'Elegante y profesional' },
  { name: 'Poppins',      label: 'Poppins',        category: 'Geométrica',  sample: 'Redonda y amigable' },
  { name: 'Nunito',       label: 'Nunito',         category: 'Redondeada',  sample: 'Suave y accesible' },
  { name: 'Source Sans 3',label: 'Source Sans 3',  category: 'Sans-serif',  sample: 'Diseñada para interfaces' },
  { name: 'DM Sans',      label: 'DM Sans',        category: 'Sans-serif',  sample: 'Compacta y funcional' },
]

export const DEFAULT_FONT = 'Noto Sans'

// Fuentes ya incluidas en el index.html
const PRELOADED_FONTS = new Set(['Noto Sans', 'Montserrat', 'Inter'])

/** Carga una Google Font dinámicamente si no está ya cargada */
export function loadGoogleFont(fontName: string): void {
  if (!fontName || PRELOADED_FONTS.has(fontName)) return

  const id = `gfont-${fontName.replace(/\s+/g, '-').toLowerCase()}`
  if (document.getElementById(id)) return

  const family = encodeURIComponent(fontName) + ':wght@400;500;600;700'
  const link = document.createElement('link')
  link.id   = id
  link.rel  = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`
  document.head.appendChild(link)
}

/** Aplica la fuente al documento completo vía CSS variable */
export function applyFont(fontName: string): void {
  loadGoogleFont(fontName)
  document.documentElement.style.setProperty(
    '--font-ui',
    `"${fontName}", ui-sans-serif, system-ui, sans-serif`
  )
}
