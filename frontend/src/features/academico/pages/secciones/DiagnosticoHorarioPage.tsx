import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { academicoApi } from '../../services/academico'
import { usePeriodos, selectCls } from '../tabs/shared'

const TIPO_LABEL: Record<string, string> = {
  docente: 'Docente traslapado',
  aula: 'Aula traslapada',
  grupo: 'Grupo traslapado',
}

export default function DiagnosticoHorarioPage() {
  const { data: periodos = [] } = usePeriodos()
  const periodoActivo = periodos.find(p => p.activo)
  const [periodoId, setPeriodoId] = useState(periodoActivo?.id ?? '')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['diagnostico-horario', periodoId],
    queryFn: () => academicoApi.getDiagnosticoHorario(periodoId),
    enabled: !!periodoId,
  })

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Gestión Académica
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Diagnóstico de horarios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Auditoría de traslapes de docente, aula o grupo que pudieron colarse fuera del constructor (datos importados, ediciones manuales, etc).</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap gap-3 items-end">
          <div className="min-w-56">
            <label className="block text-xs font-medium text-slate-600 mb-1">Periodo</label>
            <select className={selectCls} value={periodoId} onChange={e => setPeriodoId(e.target.value)}>
              <option value="">— Selecciona periodo —</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' ●' : ''}</option>)}
            </select>
          </div>
          <button
            onClick={() => refetch()}
            disabled={!periodoId || isFetching}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {isFetching ? 'Analizando…' : 'Analizar'}
          </button>
        </div>

        {!periodoId && (
          <div className="bg-white border border-slate-200 rounded-xl px-6 py-12 text-center text-sm text-slate-400">
            Selecciona un periodo para ejecutar el diagnóstico.
          </div>
        )}

        {periodoId && isLoading && (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Analizando…</div>
        )}

        {periodoId && data && (
          data.total === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-6 py-8 text-center text-sm text-emerald-700">
              Sin traslapes detectados en este periodo. ✓
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-red-50 text-sm text-red-700 font-medium">
                {data.total} traslape{data.total !== 1 ? 's' : ''} detectado{data.total !== 1 ? 's' : ''}
              </div>
              <div className="divide-y divide-slate-100">
                {data.empalmes.map((e, i) => (
                  <div key={i} className="px-5 py-3 flex flex-col gap-1">
                    <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">{TIPO_LABEL[e.tipo] ?? e.tipo}</span>
                    <p className="text-sm text-slate-700">{e.mensaje}</p>
                    <p className="text-xs text-slate-500">{e.horario_a}</p>
                    <p className="text-xs text-slate-500">{e.horario_b}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
