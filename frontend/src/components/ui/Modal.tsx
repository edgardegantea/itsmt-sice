import type { ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg' | 'xl'
}

const SIZE = { md: 'sm:max-w-3xl', lg: 'sm:max-w-5xl', xl: 'sm:max-w-6xl' }

export default function Modal({ title, onClose, children, size = 'md' }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-0 sm:px-4">
      <div className={`bg-white w-full sm:rounded-xl rounded-t-2xl shadow-2xl ${SIZE[size]} ring-1 ring-slate-200 max-h-[90dvh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none rounded-lg hover:bg-slate-100"
          >
            ×
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
