import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../../../config/apiClient'

export const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50'
export const inputErrCls = 'w-full border border-red-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white disabled:bg-slate-50'
export const selectCls = inputCls
export const icls = (e?: string) => e ? inputErrCls : inputCls

export function Field({ label, children, full, error }: { label: string; children: React.ReactNode; full?: boolean; error?: string }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export function extractApiErrors(e: unknown): Record<string, string> {
  const errs = (e as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors
  return errs ? Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]])) : {}
}

export function ModalWrap({ title, onClose, children, onSave, saving }: {
  title: string; onClose: () => void; children: React.ReactNode; onSave?: () => void; saving?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onKeyDown={e => { if (e.key === 'Escape' && !saving) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} disabled={saving} className="text-slate-400 hover:text-slate-700 text-2xl leading-none disabled:opacity-40">&times;</button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto">{children}</div>
        {onSave && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-40">Cancelar</button>
            <button onClick={onSave} disabled={saving} className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Table primitives ──────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc' | null

export function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{children}</th>
}

export function SortableTh({ children, field, sort, onSort }: {
  children: React.ReactNode
  field: string
  sort: { field: string; dir: SortDir }
  onSort: (f: string) => void
}) {
  const active = sort.field === field
  const dir = active ? sort.dir : null
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide select-none cursor-pointer hover:text-slate-800 transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}>
          {dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : '↕'}
        </span>
      </span>
    </th>
  )
}

export function useSorted<T>(data: T[], defaultField = '', defaultDir: SortDir = null) {
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: defaultField, dir: defaultDir })

  const onSort = useCallback((field: string) => {
    setSort(prev => ({
      field,
      dir: prev.field === field ? (prev.dir === 'asc' ? 'desc' : prev.dir === 'desc' ? null : 'asc') : 'asc',
    }))
  }, [])

  const sorted = sort.field && sort.dir
    ? [...data].sort((a, b) => {
        const av = getNestedVal(a, sort.field) as string | number
        const bv = getNestedVal(b, sort.field) as string | number
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sort.dir === 'asc' ? cmp : -cmp
      })
    : data

  return { sorted, sort, onSort }
}

function getNestedVal(obj: unknown, path: string): unknown {
  return path.split('.').reduce((o, k) => (o as Record<string, unknown>)?.[k], obj) ?? ''
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function SkeletonRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-slate-200 rounded animate-pulse"
                style={{ width: j === 0 ? '60%' : j === cols - 1 ? '40%' : '75%', animationDelay: `${i * 60}ms` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyRow({ cols, msg = 'Sin registros.' }: { cols: number; msg?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center">
        <div className="flex flex-col items-center gap-2">
          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <span className="text-sm text-slate-400">{msg}</span>
        </div>
      </td>
    </tr>
  )
}

// ── Capacity bar ──────────────────────────────────────────────────────────────

export function CapacityBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2 min-w-24">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums ${pct >= 100 ? 'text-red-600' : 'text-slate-700'}`}>
        {current}/{max}
      </span>
    </div>
  )
}

// ── Error helpers ─────────────────────────────────────────────────────────────

export function mutationError(e: unknown): string {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? 'Ocurrió un error. Intenta de nuevo.'
}

// ── Shared queries ────────────────────────────────────────────────────────────

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
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as { id: string; nombre: string; activo: boolean; horarios_liberados: boolean }[]),
    staleTime: 60_000,
  })
}

type AlumnoSelect = {
  id: string
  numero_control: string
  semestre_actual: number
  user?: { name: string }
  carrera?: { id: string; nombre: string; clave: string }
  inscripcion?: { aspirante?: { nombres: string; apellido_paterno: string; apellido_materno?: string } }
}

export function useAlumnos(params?: { carrera_id?: string; semestre?: number }) {
  return useQuery({
    queryKey: ['alumnos-select', params?.carrera_id, params?.semestre],
    enabled: params === undefined || !!params.carrera_id,
    queryFn: () => {
      const p: Record<string, string> = { per_page: '500' }
      if (params?.carrera_id) p.carrera_id = params.carrera_id
      if (params?.semestre)   p.semestre   = String(params.semestre)
      return apiClient.get('/alumnos', { params: p }).then(r => {
        const d = r.data.data
        return (Array.isArray(d) ? d : d.data ?? []) as AlumnoSelect[]
      })
    },
    staleTime: 30_000,
  })
}
