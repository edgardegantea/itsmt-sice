import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'
import { inputCls } from '../../academico/pages/tabs/shared'

interface AuditLog {
  id: string
  accion: string
  metodo?: string
  ruta?: string
  entidad?: string
  status_code?: number
  ip_address?: string
  created_at: string
  user?: { name: string; email: string }
}

interface Indicadores {
  total_eventos_30d: number
  por_accion: Record<string, number>
  por_entidad: Record<string, number>
  logins_fallidos_30d: number
}

const ACCION_CLS: Record<string, string> = {
  login: 'bg-green-100 text-green-700',
  logout: 'bg-slate-100 text-slate-600',
  login_fallido: 'bg-red-100 text-red-700',
  post: 'bg-blue-100 text-blue-700',
  patch: 'bg-yellow-100 text-yellow-700',
  put: 'bg-yellow-100 text-yellow-700',
  delete: 'bg-red-100 text-red-700',
}

export default function AuditLogPage() {
  const [tab, setTab] = useState<'bitacora' | 'indicadores'>('bitacora')
  const [filtros, setFiltros] = useState({ accion: '', entidad: '', desde: '', hasta: '' })

  const { data: logs } = useQuery<{ data: AuditLog[] }>({
    queryKey: ['audit-logs', filtros],
    queryFn: () => apiClient.get('/audit-logs', { params: filtros }).then(r => r.data.data),
    enabled: tab === 'bitacora',
  })

  const { data: indicadores } = useQuery<Indicadores>({
    queryKey: ['audit-logs-indicadores'],
    queryFn: () => apiClient.get('/audit-logs/indicadores').then(r => r.data.data),
    enabled: tab === 'indicadores',
  })

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Auditoría y Trazabilidad</h1>
        <p className="text-sm text-slate-500 mt-0.5">Bitácora inmutable de acciones sensibles del sistema</p>
      </div>

      <div className="flex gap-1 bg-white border border-slate-200 rounded-lg overflow-hidden w-fit">
        {[
          { key: 'bitacora', label: 'Bitácora' },
          { key: 'indicadores', label: 'Indicadores' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 text-sm font-medium ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'bitacora' && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
            <input placeholder="Acción (ej. login, post, patch)" value={filtros.accion} onChange={e => setFiltros(f => ({ ...f, accion: e.target.value }))} className={`${inputCls} w-56`} />
            <input placeholder="Entidad (ej. inventario, egresados)" value={filtros.entidad} onChange={e => setFiltros(f => ({ ...f, entidad: e.target.value }))} className={`${inputCls} w-56`} />
            <input type="date" value={filtros.desde} onChange={e => setFiltros(f => ({ ...f, desde: e.target.value }))} className={inputCls} />
            <input type="date" value={filtros.hasta} onChange={e => setFiltros(f => ({ ...f, hasta: e.target.value }))} className={inputCls} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Acción</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Ruta</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estatus</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(logs?.data ?? []).length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">Sin eventos registrados</td></tr>
                ) : (logs?.data ?? []).map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-700">{log.user?.name ?? 'Anónimo'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACCION_CLS[log.accion] ?? 'bg-slate-100 text-slate-600'}`}>{log.accion}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{log.ruta ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{log.status_code ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{log.ip_address ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'indicadores' && indicadores && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Eventos (30 días)</p>
              <p className="text-2xl font-bold text-slate-700">{indicadores.total_eventos_30d}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Logins fallidos (30 días)</p>
              <p className="text-2xl font-bold text-red-700">{indicadores.logins_fallidos_30d}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Eventos por acción</p>
            <div className="space-y-1 text-sm">
              {Object.entries(indicadores.por_accion).map(([accion, total]) => (
                <div key={accion} className="flex justify-between border-b border-slate-100 py-1">
                  <span className="text-slate-600">{accion}</span>
                  <span className="font-medium text-slate-800">{total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
