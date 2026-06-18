import { useQuery } from '@tanstack/react-query'
import apiClient from '../../../../config/apiClient'

export const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50'
export const selectCls = inputCls

export function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

export function ModalWrap({ title, onClose, children, onSave, saving }: {
  title: string; onClose: () => void; children: React.ReactNode; onSave: () => void; saving?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto">{children}</div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
          <button onClick={onSave} disabled={saving} className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{children}</th>
}

export function EmptyRow({ cols, msg = 'Sin registros.' }: { cols: number; msg?: string }) {
  return <tr><td colSpan={cols} className="px-4 py-8 text-center text-slate-400 text-sm">{msg}</td></tr>
}

// Shared select queries
export function useCarreras() {
  return useQuery({
    queryKey: ['carreras-select'],
    queryFn: () => apiClient.get('/carreras').then(r => r.data.data as { id: string; nombre: string; clave: string }[]),
    staleTime: 60_000,
  })
}

export function usePeriodos() {
  return useQuery({
    queryKey: ['periodos-select'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; activo: boolean }[]),
    staleTime: 60_000,
  })
}

export function useAlumnos() {
  return useQuery({
    queryKey: ['alumnos-select'],
    queryFn: () => apiClient.get('/alumnos').then(r => {
      const d = r.data.data
      return (Array.isArray(d) ? d : d.data ?? []) as { id: string; numero_control: string; semestre_actual: number; user?: { name: string } }[]
    }),
    staleTime: 30_000,
  })
}
