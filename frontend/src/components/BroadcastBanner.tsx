import { useState } from 'react'
import { Megaphone } from 'lucide-react'

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
        <Megaphone className="w-4 h-4 shrink-0 animate-bounce" strokeWidth={2} aria-hidden="true" />
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
