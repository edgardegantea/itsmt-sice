import { useEffect, useRef } from 'react'
import {
  usePreferenciasStore,
  SIDEBAR_COLORS,
  type Densidad,
  type EscalaTexto,
  type ColorSidebar,
  type Tema,
  type ModoMenu,
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
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-200 leading-snug">{label}</p>
        {description && <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors mt-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400 ${
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
    tema, densidad, escalaTexto, colorSidebar, sidebarColapsado, modoMenu,
    altoContraste, reducirMovimiento, textoEspaciado, focusRealzado, subrayarEnlaces,
    set, reset,
  } = usePreferenciasStore()
  const esSuperadmin = !!useAuthStore(s => s.user)?.roles.includes('superadmin')

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
      {/* Modal centrado en pantalla en vez de anclado a una esquina: así el tamaño del
          panel (que crece con textos grandes/accesibilidad) nunca depende de cuánto
          espacio quede arriba o abajo del botón que lo abre — siempre cabe. */}
      <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4" onClick={onClose} aria-hidden>
        <div
          ref={ref}
          role="dialog"
          aria-label="Preferencias y accesibilidad"
          onClick={e => e.stopPropagation()}
          className="w-full max-w-sm max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          style={{ backgroundColor: 'var(--color-sidebar-user, #1a3a5c)' }}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
          <span className="text-sm font-semibold text-white">Preferencias</span>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-white text-lg leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1 min-h-0">

          {/* ── VISUALIZACIÓN ── */}
          <section>
            <Divider label="Visualización" />

            {/* Tema */}
            <div className="mt-3">
              <p className="text-[10px] font-medium text-slate-400 mb-1.5">Tema</p>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { v: 'claro', label: 'Claro', icon: (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="4" /><path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" /></svg>
                  ) },
                  { v: 'oscuro', label: 'Oscuro', icon: (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
                  ) },
                  { v: 'sistema', label: 'Sistema', icon: (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="12" rx="1.5" /><path strokeLinecap="round" d="M8 20h8M12 16v4" /></svg>
                  ) },
                ] as { v: Tema; label: string; icon: React.ReactNode }[]).map(({ v, label, icon }) => (
                  <button
                    key={v}
                    onClick={() => set({ tema: v })}
                    aria-pressed={tema === v}
                    className={`flex flex-col items-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                      tema === v
                        ? 'bg-white text-slate-900 border-white'
                        : 'bg-white/5 text-slate-300 border-transparent hover:bg-white/10'
                    }`}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              {/* Densidad */}
              <div>
                <p className="text-[10px] font-medium text-slate-400 mb-1.5">Densidad de filas</p>
                <div className="grid grid-cols-1 gap-1">
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
              </div>

              {/* Escala de texto */}
              <div>
                <p className="text-[10px] font-medium text-slate-400 mb-1.5">Tamaño de texto</p>
                <div className="grid grid-cols-5 gap-1">
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
                      className={`py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                        escalaTexto === v
                          ? 'bg-white text-slate-900 border-white'
                          : 'bg-white/5 text-slate-300 border-transparent hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Preview de texto */}
                <div className="mt-2.5 rounded-lg border border-white/10 px-2.5 py-2 text-slate-300 bg-white/5" style={{
                  fontSize: escalaTexto === 'muy-pequena' ? 11 : escalaTexto === 'pequena' ? 12 : escalaTexto === 'normal' ? 13 : escalaTexto === 'grande' ? 15 : 17,
                }}>
                  Aa Ejemplo
                </div>
              </div>
            </div>

            {/* Fila de ejemplo con densidad aplicada */}
            <div className="mt-3 rounded-lg overflow-hidden border border-white/10 text-[11px]">
              {(['Fila de ejemplo', 'Otra fila']).map((r, i) => (
                <div key={i} className={`flex gap-3 text-slate-300 bg-white/5 border-b border-white/5 last:border-0 ${
                  densidad === 'compacta' ? 'py-0.5 px-2' : densidad === 'comoda' ? 'py-2.5 px-3' : 'py-1.5 px-2.5'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0 self-center" />
                  {r}
                </div>
              ))}
            </div>

            {/* Color del sidebar — solo superadmin: es una preferencia global de marca, no
                personal, así que el resto de roles no debe poder cambiarla desde aquí. */}
            {esSuperadmin && (
              <div className="mt-3.5">
                <p className="text-[10px] font-medium text-slate-400 mb-1.5">Color del menú</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(SIDEBAR_COLORS) as [ColorSidebar, typeof SIDEBAR_COLORS[ColorSidebar]][]).map(
                    ([key, { swatch, label }]) => (
                      <button
                        key={key}
                        title={label}
                        aria-label={label}
                        aria-pressed={colorSidebar === key}
                        onClick={() => set({ colorSidebar: key })}
                        className={`w-7 h-7 rounded-full transition-all ring-2 ring-offset-2 ring-offset-transparent ${
                          colorSidebar === key ? 'ring-white scale-110' : 'ring-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: swatch }}
                      />
                    )
                  )}
                </div>
              </div>
            )}

            <div className="mt-3.5">
              <Toggle
                checked={sidebarColapsado}
                onChange={() => set({ sidebarColapsado: !sidebarColapsado })}
                label="Menú contraído al iniciar"
                description="Solo íconos por defecto"
              />
            </div>
          </section>

          {/* ── NAVEGACIÓN ── */}
          <section>
            <Divider label="Navegación" />
            <div className="mt-3">
              <p className="text-[10px] font-medium text-slate-400 mb-1.5">Forma del menú</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { v: 'clasico', label: 'Clásico', desc: 'Lista de grupos, colapsables' },
                  { v: 'riel', label: 'Riel de íconos', desc: 'Un panel por sección' },
                  { v: 'superior', label: 'Barra superior', desc: 'Menú horizontal arriba' },
                ] as { v: ModoMenu; label: string; desc: string }[]).map(({ v, label, desc }) => (
                  <button
                    key={v}
                    onClick={() => set({ modoMenu: v })}
                    aria-pressed={modoMenu === v}
                    className={`flex flex-col items-start gap-0.5 py-2 px-2.5 rounded-lg text-left transition-all border ${
                      modoMenu === v
                        ? 'bg-white text-slate-900 border-white'
                        : 'bg-white/5 text-slate-300 border-transparent hover:bg-white/10'
                    }`}
                  >
                    <span className="text-[11px] font-medium">{label}</span>
                    <span className={`text-[10px] ${modoMenu === v ? 'text-slate-500' : 'text-slate-500'}`}>{desc}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 leading-snug">
                En cualquiera de las tres formas puedes anclar tus páginas más usadas con la
                estrella (★) al pasar el cursor sobre un enlace, y saltar directo a cualquier
                pantalla con <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300 text-[9px]">Ctrl</kbd>+<kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300 text-[9px]">K</kbd>.
              </p>
            </div>
          </section>

          {/* ── ACCESIBILIDAD ── */}
          <section>
            <Divider label="Accesibilidad" />
            <div className="mt-1 divide-y divide-white/5">
              <Toggle
                checked={altoContraste}
                onChange={() => set({ altoContraste: !altoContraste })}
                label="Alto contraste"
                description="Aumenta el contraste de colores"
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
                description="Mayor interlineado y separación"
              />
              <Toggle
                checked={focusRealzado}
                onChange={() => set({ focusRealzado: !focusRealzado })}
                label="Foco realzado"
                description="Indicador visible al navegar con teclado"
              />
              <Toggle
                checked={subrayarEnlaces}
                onChange={() => set({ subrayarEnlaces: !subrayarEnlaces })}
                label="Subrayar enlaces"
                description="Distingue botones y vínculos sin depender del color"
              />
            </div>
          </section>

          {/* Restablecer */}
          <button
            onClick={reset}
            className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 rounded-lg hover:bg-white/5 transition-colors border border-white/10"
          >
            Restablecer todo
          </button>
        </div>
        </div>
      </div>
    </>
  )
}
