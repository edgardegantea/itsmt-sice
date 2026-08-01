import type { ReactNode } from 'react'
import Modal from './Modal'

export interface DetailField {
  label: string
  value: ReactNode
  full?: boolean
}

/** Modal de "ver detalle" genérico: título + lista de campos etiqueta/valor, para usarse en cualquier tabla/listado. */
export default function DetailModal({ title, fields, onClose, footer }: {
  title: string
  fields: DetailField[]
  onClose: () => void
  footer?: ReactNode
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {fields.map((f, i) => (
          <div key={i} className={f.full ? 'sm:col-span-2' : ''}>
            <p className="text-xs font-medium text-slate-500">{f.label}</p>
            <div className="text-sm text-slate-800 mt-0.5">{f.value ?? <span className="text-slate-300">—</span>}</div>
          </div>
        ))}
      </div>
      {footer && <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
    </Modal>
  )
}
