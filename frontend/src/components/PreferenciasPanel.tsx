import { useEffect, useRef } from 'react'
import {
  usePreferenciasStore,
  SIDEBAR_COLORS,
  type Densidad,
  type EscalaTexto,
  type ColorSidebar,
} from '../store/preferenciasStore'
import { useAuthStore } from '../store/authStore'

interface Props {
  open: boolean
  onClose: () => void
}

function Toggle({
  checked, onChange, label, description,
}: {
  checked: boolean
  onChange: () => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-200 leading-snug">{label}</p>
        {description && <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400 ${
          checked ? 'bg-blue-500' : 'bg-white/20'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">{label}</span>
      <span className="flex-1 h-px bg-white/10" />
    </div>
  )
}

export default function PreferenciasPanel({ open, onClose }: Props) {
  const {
    densidad, escalaTexto, colorSidebar, sidebarColapsado,
    altoContraste, reducirMovimiento, textoEspaciado, focusRealzado, subrayarEnlaces,
    set, reset,
  } = usePreferenciasStore()

  const { user } = useAuthStore()
  const esSuperadmin = user?.roles?.includes('superadmin') ?? false

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />

      <div
        ref={ref}
        role="dialog"
        aria-label="Preferencias y accesibilidad"
        className="fixed bottom-16 left-2 z-50 w-76 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
        style={{ backgroundColor: 'var(--color-sidebar-user, #1a3a5c)', width: '18rem' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-semibold text-white">Preferencias</span>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-white text-lg leading-none">&times;</button>
        </div>

        <div className={`p-4 space-y-4 overflow-y-auto max-h-[82vh] ${!esSuperadmin ? 'pointer-events-none select-none' : ''}`}>

          {!esSuperadmin && (
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-[11px] text-yellow-300 leading-snug">
              Solo el <strong>superadministrador</strong> puede modificar estas preferencias.
            </div>
          )}

          {/* ── VISUALIZACIÓN ── */}
          <Divider label="Visualización" />

          {/* Densidad */}
          <div>
            <p className="text-[10px] font-medium text-slate-400 mb-2">Densidad de filas</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { v: 'compacta', label: 'Compacta' },
                { v: 'normal',   label: 'Normal'   },
                { v: 'comoda',   label: 'Cómoda'   },
              ] as { v: Densidad; label: string }[]).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => set({ densidad: v })}
                  aria-pressed={densidad === v}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    densidad === v
                      ? 'bg-white text-slate-900 border-white'
                      : 'bg-white/5 text-slate-300 border-transparent hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Preview */}
            <div className="mt-2 rounded-lg overflow-hidden border border-white/10 text-[11px]">
              {(['Fila de ejemplo', 'Otra fila']).map((r, i) => (
                <div key={i} className={`flex gap-3 text-slate-300 bg-white/5 border-b border-white/5 last:border-0 ${
                  densidad === 'compacta' ? 'py-0.5 px-2' : densidad === 'comoda' ? 'py-2.5 px-3' : 'py-1.5 px-2.5'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0 self-center" />
                  {r}
                </div>
              ))}
            </div>
          </div>

          {/* Escala de texto */}
          <div>
            <p className="text-[10px] font-medium text-slate-400 mb-2">Tamaño de texto</p>
            <div className="grid grid-cols-5 gap-1.5">
              {([
                { v: 'muy-pequena', label: 'XS' },
                { v: 'pequena',     label: 'S'  },
                { v: 'normal',      label: 'M'  },
                { v: 'grande',      label: 'L'  },
                { v: 'muy-grande',  label: 'XL' },
              ] as { v: EscalaTexto; label: string }[]).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => set({ escalaTexto: v })}
                  aria-pressed={escalaTexto === v}
                  title={v === 'muy-pequena' ? 'Muy pequeño (12px)' : v === 'pequena' ? 'Pequeño (13px)' : v === 'normal' ? 'Normal (14px)' : v === 'grande' ? 'Grande (16px)' : 'Muy grande (18px)'}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    escalaTexto === v
                      ? 'bg-white text-slate-900 border-white'
                      : 'bg-white/5 text-slate-300 border-transparent hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Color del sidebar */}
          <div>
            <p className="text-[10px] font-medium text-slate-400 mb-2">Color del menú</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(SIDEBAR_COLORS) as [ColorSidebar, typeof SIDEBAR_COLORS[ColorSidebar]][]).map(
                ([key, { swatch, label }]) => (
                  <button
                    key={key}
                    title={label}
                    aria-label={label}
                    aria-pressed={colorSidebar === key}
                    onClick={() => set({ colorSidebar: key })}
                    className={`w-8 h-8 rounded-full transition-all ring-2 ring-offset-2 ring-offset-transparent ${
                      colorSidebar === key ? 'ring-white scale-110' : 'ring-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch }}
                  />
                )
              )}
            </div>
          </div>

          <Toggle
            checked={sidebarColapsado}
            onChange={() => set({ sidebarColapsado: !sidebarColapsado })}
            label="Menú contraído al iniciar"
            description="Solo íconos por defecto"
          />

          {/* ── ACCESIBILIDAD ── */}
          <Divider label="Accesibilidad" />

          <Toggle
            checked={altoContraste}
            onChange={() => set({ altoContraste: !altoContraste })}
            label="Alto contraste"
            description="Aumenta el contraste de colores para mejor legibilidad"
          />

          <Toggle
            checked={reducirMovimiento}
            onChange={() => set({ reducirMovimiento: !reducirMovimiento })}
            label="Reducir movimiento"
            description="Desactiva transiciones y animaciones"
          />

          <Toggle
            checked={textoEspaciado}
            onChange={() => set({ textoEspaciado: !textoEspaciado })}
            label="Texto espaciado"
            description="Mayor interlineado y separación entre letras"
          />

          <Toggle
            checked={focusRealzado}
            onChange={() => set({ focusRealzado: !focusRealzado })}
            label="Foco realzado"
            description="Indicador de foco visible al navegar con teclado"
          />

          <Toggle
            checked={subrayarEnlaces}
            onChange={() => set({ subrayarEnlaces: !subrayarEnlaces })}
            label="Subrayar enlaces"
            description="Subraya botones y vínculos para distinguirlos sin depender del color"
          />

          {/* Restablecer */}
          {esSuperadmin && (
            <button
              onClick={reset}
              className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 rounded-lg hover:bg-white/5 transition-colors border border-white/10 mt-1"
            >
              Restablecer todo
            </button>
          )}
        </div>
      </div>
    </>
  )
}
