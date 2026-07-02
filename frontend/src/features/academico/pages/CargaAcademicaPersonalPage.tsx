import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { academicoApi, type CargaDocenteItem } from '../services/academico'
import apiClient from '../../../config/apiClient'
import { selectCls } from './tabs/shared'

const CONTRATO_COLOR: Record<string, string> = {
  base:        'bg-blue-100 text-blue-700',
  interino:    'bg-purple-100 text-purple-700',
  hora_clase:  'bg-slate-100 text-slate-600',
  medio_tiempo:'bg-orange-100 text-orange-700',
}

export default function CargaAcademicaPersonalPage() {
  const [periodoId, setPeriodoId] = useState('')

  const { data: periodos = [] } = useQuery({
    queryKey: ['periodos-lista'],
    queryFn: () => apiClient.get('/periodos').then(r => r.data.data as { id: string; nombre: string }[]),
  })

  const { data: carga = [], isLoading } = useQuery({
    queryKey: ['carga-academica-personal', periodoId],
    queryFn: () => academicoApi.getReporteCargaAcademica(periodoId ? { periodo_id: periodoId } : {}),
  })

  const totalHoras = carga.reduce((s, d) => s + (d.total_horas_semana ?? 0), 0)
  const promHoras = carga.length > 0 ? (totalHoras / carga.length).toFixed(1) : '—'

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Carga Académica del Personal</h1>
          <p className="text-sm text-slate-500 mt-0.5">Horas frente a grupo y grupos asignados por docente</p>
        </div>

        {/* Filtro */}
        <div className="flex gap-3 items-center">
          <select
            value={periodoId}
            onChange={e => setPeriodoId(e.target.value)}
            className={`${selectCls} max-w-xs`}
          >
            <option value="">Todos los periodos</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        {/* KPIs */}
        {!isLoading && carga.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400">Total docentes</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{carga.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400">Total horas/semana</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{totalHoras}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400">Promedio hrs/docente</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{promHoras}</p>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Docente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Contrato</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Grupos</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Hrs/sem</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Materias</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : carga.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm italic">Sin datos de carga académica.</td>
                </tr>
              ) : (
                carga.map((d: CargaDocenteItem) => {
                  const sobrecarga = d.total_horas_semana > 24
                  const subcarga = d.total_grupos === 0
                  return (
                    <tr key={d.docente_id} className={`transition-colors ${sobrecarga ? 'bg-red-50/30' : subcarga ? 'bg-yellow-50/30' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{d.nombre}</p>
                        <p className="text-xs text-slate-400">{d.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {d.tipo_contrato ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONTRATO_COLOR[d.tipo_contrato] ?? 'bg-slate-100 text-slate-600'}`}>
                            {d.tipo_contrato.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-700">{d.total_grupos}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-lg ${sobrecarga ? 'text-red-600' : subcarga ? 'text-yellow-600' : 'text-slate-800'}`}>
                          {d.total_horas_semana}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {d.materias && d.materias.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {d.materias.slice(0, 3).map((m, i) => (
                              <span key={i} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{m}</span>
                            ))}
                            {d.materias.length > 3 && (
                              <span className="text-xs text-slate-400">+{d.materias.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sobrecarga ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Sobrecarga</span>
                        ) : subcarga ? (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Sin carga</span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Normal</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
