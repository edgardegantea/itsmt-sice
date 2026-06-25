import { useEffect, useRef, useState, useCallback } from 'react'

// ── Component ─────────────────────────────────────────────────────────────────

interface DialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

const VARIANT = {
  danger:  {
    icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    ring: 'bg-red-100 text-red-600',
    btn:  'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
  },
  warning: {
    icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    ring: 'bg-amber-100 text-amber-600',
    btn:  'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-400',
  },
  info: {
    icon: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
    ring: 'bg-blue-100 text-blue-600',
    btn:  'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
  },
}

export default function ConfirmDialog({
  open, title, description,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'danger', onConfirm, onCancel, loading = false,
}: DialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const v = VARIANT[variant]

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onCancel() }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && onCancel()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 flex gap-4">
          <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${v.ring}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={v.icon} />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-[15px] leading-snug">{title}</h3>
            {description && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{description}</p>}
          </div>
        </div>
        <div className="flex gap-3 justify-end px-6 pb-5">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-slate-300 outline-none"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-1 outline-none ${v.btn}`}
          >
            {loading ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface ConfirmState {
  title: string
  description?: string
  confirmLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null)
  const [loading, setLoading] = useState(false)

  const confirm = useCallback((opts: ConfirmState) => {
    setState(opts)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!state) return
    setLoading(true)
    try {
      await state.onConfirm()
    } finally {
      setLoading(false)
      setState(null)
    }
  }, [state])

  const handleCancel = useCallback(() => {
    if (!loading) setState(null)
  }, [loading])

  const dialog = (
    <ConfirmDialog
      open={!!state}
      title={state?.title ?? ''}
      description={state?.description}
      confirmLabel={state?.confirmLabel ?? 'Confirmar'}
      variant={state?.variant ?? 'danger'}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      loading={loading}
    />
  )

  return { confirm, dialog }
}
