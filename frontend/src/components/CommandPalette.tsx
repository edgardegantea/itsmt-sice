import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

interface PaletteItem { to: string; label: string }
interface PaletteGroup { id: string; label: string; items: PaletteItem[] }

interface Props {
  open: boolean
  onClose: () => void
  groups: PaletteGroup[]
}

/**
 * Saltar directo a cualquier pantalla escribiendo su nombre (Ctrl/Cmd+K) — pensado
 * para cuando ya sabes a dónde vas y no quieres bajar por un sidebar de ~80 enlaces
 * repartidos en 17 grupos para encontrarlo.
 */
export default function CommandPalette({ open, onClose, groups }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const plano = useMemo(
    () => groups.flatMap(g => g.items.map(i => ({ ...i, grupo: g.label || 'General' }))),
    [groups]
  )

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return plano.slice(0, 8)
    return plano
      .filter(i => i.label.toLowerCase().includes(q) || i.grupo.toLowerCase().includes(q))
      .slice(0, 8)
  }, [plano, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(0)
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => { setSelected(0) }, [query])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtrados.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = filtrados[selected]
        if (item) { navigate(item.to); onClose() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, filtrados, selected, navigate, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-start justify-center pt-[15vh] p-4"
      onClick={onClose}
      aria-hidden
    >
      <div
        role="dialog"
        aria-label="Buscar pantalla"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl shadow-2xl bg-white overflow-hidden border border-slate-200"
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={2} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar una pantalla…"
            className="flex-1 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
          <kbd className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 shrink-0">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-1.5">
          {filtrados.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">Sin resultados.</p>
          ) : (
            filtrados.map((item, i) => (
              <button
                key={item.to}
                onMouseEnter={() => setSelected(i)}
                onClick={() => { navigate(item.to); onClose() }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                  i === selected ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <span className="text-slate-800">{item.label}</span>
                <span className="text-xs text-slate-400 shrink-0">{item.grupo}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
