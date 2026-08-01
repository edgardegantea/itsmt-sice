import { useState } from 'react'

export type ViewMode = 'lista' | 'cards'

/** Conmutador vista de lista (tabla) / vista de tarjetas, reutilizable en cualquier página con listados. */
export default function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden shrink-0">
      <button
        type="button"
        onClick={() => onChange('lista')}
        title="Vista de lista"
        className={`px-2.5 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${
          value === 'lista' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Lista
      </button>
      <button
        type="button"
        onClick={() => onChange('cards')}
        title="Vista de tarjetas"
        className={`px-2.5 py-2 text-xs font-medium flex items-center gap-1.5 border-l border-slate-300 transition-colors ${
          value === 'cards' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Tarjetas
      </button>
    </div>
  )
}

/** Hook mínimo: guarda la preferencia de vista por página en localStorage. */
export function useViewMode(storageKey: string, defaultMode: ViewMode = 'lista') {
  const [mode, setModeState] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(`view-mode:${storageKey}`)
    return saved === 'cards' || saved === 'lista' ? saved : defaultMode
  })
  function setMode(v: ViewMode) {
    setModeState(v)
    localStorage.setItem(`view-mode:${storageKey}`, v)
  }
  return [mode, setMode] as const
}
