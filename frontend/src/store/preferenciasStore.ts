import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Densidad    = 'compacta' | 'normal' | 'comoda'
export type EscalaTexto = 'muy-pequena' | 'pequena' | 'normal' | 'grande' | 'muy-grande'
export type ColorSidebar = 'institucional' | 'vino_tecnm' | 'dorado_tecnm' | 'slate' | 'green' | 'purple' | 'rose' | 'amber'
export type Tema = 'claro' | 'oscuro' | 'sistema'
// 'clasico': la lista de grupos apilada de siempre (con grupos colapsables).
// 'riel': una franja angosta de íconos por grupo — al elegir uno se despliega
// un panel con sus enlaces, en vez de tener los ~80 enlaces de golpe en pantalla.
// 'superior': sin panel lateral — una barra horizontal arriba con un menú
// desplegable por grupo, para quien está acostumbrado a ese patrón de navegación.
export type ModoMenu = 'clasico' | 'riel' | 'superior'

export interface Preferencias {
  // Visualización
  tema:              Tema
  densidad:          Densidad
  escalaTexto:       EscalaTexto
  colorSidebar:      ColorSidebar
  sidebarColapsado:  boolean
  // Navegación
  modoMenu:          ModoMenu
  gruposColapsados:  string[]  // ids de NAV_GROUPS que el usuario contrajo (modo clásico)
  favoritos:         string[]  // rutas ancladas arriba del todo, en ambos modos
  // Accesibilidad
  altoContraste:     boolean
  reducirMovimiento: boolean
  textoEspaciado:    boolean
  focusRealzado:     boolean
  subrayarEnlaces:   boolean
}

interface PreferenciasStore extends Preferencias {
  set: (patch: Partial<Preferencias>) => void
  toggleFavorito: (to: string) => void
  toggleGrupoColapsado: (id: string) => void
  reset: () => void
}

const DEFAULTS: Preferencias = {
  tema:              'sistema',
  densidad:          'normal',
  escalaTexto:       'normal',
  colorSidebar:      'institucional',
  sidebarColapsado:  false,
  modoMenu:          'clasico',
  gruposColapsados:  [],
  favoritos:         [],
  altoContraste:     false,
  reducirMovimiento: false,
  textoEspaciado:    false,
  focusRealzado:     false,
  subrayarEnlaces:   false,
}

export const usePreferenciasStore = create<PreferenciasStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set((s) => ({ ...s, ...patch })),
      toggleFavorito: (to) => set((s) => ({
        favoritos: s.favoritos.includes(to) ? s.favoritos.filter(f => f !== to) : [...s.favoritos, to],
      })),
      toggleGrupoColapsado: (id) => set((s) => ({
        gruposColapsados: s.gruposColapsados.includes(id) ? s.gruposColapsados.filter(g => g !== id) : [...s.gruposColapsados, id],
      })),
      reset: () => set(DEFAULTS),
    }),
    {
      name: 'sice-preferencias',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// Paleta de colores del sidebar
export const SIDEBAR_COLORS: Record<ColorSidebar, { bg: string; label: string; swatch: string }> = {
  institucional: { bg: 'var(--color-primario, #1b396a)', label: 'Azul TecNM', swatch: '#1b396a' },
  vino_tecnm:    { bg: '#8b1d41',                        label: 'Vino TecNM', swatch: '#8b1d41' },
  dorado_tecnm:  { bg: '#b38e5d',                        label: 'Oro TecNM',  swatch: '#b38e5d' },
  slate:         { bg: '#1e293b',                        label: 'Pizarra',    swatch: '#1e293b' },
  green:         { bg: '#14532d',                        label: 'Verde',      swatch: '#14532d' },
  purple:        { bg: '#3b0764',                        label: 'Morado',     swatch: '#3b0764' },
  rose:          { bg: '#881337',                        label: 'Rojo',       swatch: '#881337' },
  amber:         { bg: '#78350f',                        label: 'Café',       swatch: '#78350f' },
}
