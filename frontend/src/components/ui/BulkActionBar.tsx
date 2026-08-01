import type { ReactNode } from 'react'

/** Barra flotante de acciones por lote: aparece cuando hay elementos seleccionados en modo selección múltiple. */
export default function BulkActionBar({ count, onCancel, children }: {
  count: number
  onCancel: () => void
  children: ReactNode
}) {
  return (
    <div className="bg-slate-800 text-white rounded-lg px-4 py-3 flex items-center justify-between flex-wrap gap-3 sticky top-0 z-10">
      <span className="text-sm">{count} elemento{count !== 1 ? 's' : ''} seleccionado{count !== 1 ? 's' : ''}</span>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        <button onClick={onCancel} className="text-xs text-slate-300 hover:text-white hover:underline ml-1">Cancelar</button>
      </div>
    </div>
  )
}

/** Checkbox de fila/tarjeta para modo selección — detiene la propagación del clic. */
export function SelectCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={e => e.stopPropagation()}
      className="w-4 h-4 accent-blue-600 shrink-0"
    />
  )
}

/** Botón de "modo selección" para el header de una página. */
export function ToggleSelectionButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
        active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
      }`}
    >
      {active ? 'Cancelar selección' : 'Seleccionar varios'}
    </button>
  )
}
