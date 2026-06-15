import { useEffect, useState } from 'react'
import { useToastStore, type Toast } from '../../store/toastStore'

const STYLES: Record<string, string> = {
  success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  error:   'bg-red-50   border-red-300   text-red-800',
  warning: 'bg-amber-50 border-amber-300 text-amber-800',
  info:    'bg-blue-50  border-blue-300  text-blue-800',
}

const ICONS: Record<string, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
}

const ICON_BG: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-600',
  error:   'bg-red-100   text-red-600',
  warning: 'bg-amber-100 text-amber-600',
  info:    'bg-blue-100  text-blue-600',
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // mount → slide in
    const t1 = setTimeout(() => setVisible(true), 10)
    // before auto-remove → slide out
    const t2 = setTimeout(() => setVisible(false), 3300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg
        transition-all duration-300 ease-out
        ${STYLES[toast.type]}
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}
      `}
    >
      <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${ICON_BG[toast.type]}`}>
        {ICONS[toast.type]}
      </span>
      <p className="flex-1 text-sm leading-snug">{toast.message}</p>
      <button
        onClick={onRemove}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity text-base leading-none mt-0.5"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  )
}

export default function Toaster() {
  const { toasts, remove } = useToastStore()

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-[calc(100vw-2rem)] sm:w-96 pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={() => remove(t.id)} />
        </div>
      ))}
    </div>
  )
}
