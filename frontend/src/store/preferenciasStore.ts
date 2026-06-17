import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Densidad    = 'compacta' | 'normal' | 'comoda'
export type EscalaTexto = 'muy-pequena' | 'pequena' | 'normal' | 'grande' | 'muy-grande'
export type ColorSidebar = 'institucional' | 'slate' | 'green' | 'purple' | 'rose' | 'amber'

export interface Preferencias {
  // Visualización
  densidad:          Densidad
  escalaTexto:       EscalaTexto
  colorSidebar:      ColorSidebar
  sidebarColapsado:  boolean
  // Accesibilidad
  altoContraste:     boolean
  reducirMovimiento: boolean
  textoEspaciado:    boolean
  focusRealzado:     boolean
  subrayarEnlaces:   boolean
}

interface PreferenciasStore extends Preferencias {
  set: (patch: Partial<Preferencias>) => void
  reset: () => void
}

const DEFAULTS: Preferencias = {
  densidad:          'normal',
  escalaTexto:       'normal',
  colorSidebar:      'institucional',
  sidebarColapsado:  false,
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
  institucional: { bg: 'var(--color-primario, #1a3a5c)', label: 'Institucional', swatch: '#1a3a5c' },
  slate:         { bg: '#1e293b',                        label: 'Pizarra',       swatch: '#1e293b' },
  green:         { bg: '#14532d',                        label: 'Verde',         swatch: '#14532d' },
  purple:        { bg: '#3b0764',                        label: 'Morado',        swatch: '#3b0764' },
  rose:          { bg: '#881337',                        label: 'Rojo',          swatch: '#881337' },
  amber:         { bg: '#78350f',                        label: 'Café',          swatch: '#78350f' },
}
