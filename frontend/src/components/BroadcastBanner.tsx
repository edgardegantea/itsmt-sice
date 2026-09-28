import { useState } from 'react'

interface BroadcastBannerProps {
  mensaje: string
  tipo?: 'info' | 'warning' | 'danger' | 'success'
  activa: boolean
  onClose?: () => void
}

const TIPO_STYLES = {
  info: 'bg-brand-600 text-white border-brand-700',
  warning: 'bg-amber-500 text-slate-900 font-semibold border-amber-600',
  danger: 'bg-red-600 text-white border-red-700 font-semibold',
  success: 'bg-emerald-600 text-white border-emerald-700',
}

export default function BroadcastBanner({ mensaje, tipo = 'info', activa }: BroadcastBannerProps) {
  const [cerrado, setCerrado] = useState(false)

  if (!activa || !mensaje || cerrado) return null

  return (
    <div className={`w-full py-2 px-4 text-xs shadow-md border-b flex items-center justify-between z-40 transition-all ${TIPO_STYLES[tipo]}`}>
      <div className="flex items-center gap-2.5 mx-auto text-center font-medium">
        <svg className="w-4 h-4 shrink-0 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.38-.09-2.072-.09-2.618 0-5.118.44-7.428 1.25.992-3.87 3.52-7.07 6.942-8.59M16.5 10.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM22.5 10.5c0 5.523-4.477 10-10 10s-10-4.477-10-10" />
        </svg>
        <span>{mensaje}</span>
      </div>
      <button
        onClick={() => setCerrado(true)}
        className="p-1 rounded hover:bg-black/10 transition-colors text-current shrink-0"
        title="Ocultar aviso"
      >
        ✕
      </button>
    </div>
  )
}
