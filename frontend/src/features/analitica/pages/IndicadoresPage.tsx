import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  analiticaService,
  type IndicadoresParams,
  type DesercionRow,
  type RetencionRow,
  type EficienciaTerminalRow,
  type PromedioRow,
} from '../services/analitica'

type Tab = 'desercion' | 'retencion' | 'eficiencia' | 'promedio'

const TAB_LABELS: Record<Tab, string> = {
  desercion:  'Deserción',
  retencion:  'Retención',
  eficiencia: 'Eficiencia Terminal',
  promedio:   'Promedio Institucional',
}

function pct(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toFixed(2) + '%'
}

function Metric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  )
}

function Td({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return (
    <td className={`px-3 py-2 text-sm ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
      {children}
    </td>
  )
}

export default function IndicadoresPage() {
  const [tab, setTab] = useState<Tab>('desercion')
  const [carreraId, setCarreraId] = useState('')
  const [periodoId, setPeriodoId] = useState('')
  const [generacion, setGeneracion] = useState('')

  const params: IndicadoresParams = {}
  if (carreraId) params.carrera_id = carreraId
  if (periodoId) params.periodo_id = periodoId
  if (generacion) params.generacion = generacion

  const desercion = useQuery({
    queryKey: ['indicadores', 'desercion', params],
    queryFn: () => analiticaService.getDesercion(params),
    enabled: tab === 'desercion',
  })

  const retencion = useQuery({
    queryKey: ['indicadores', 'retencion', params],
    queryFn: () => analiticaService.getRetencion(params),
    enabled: tab === 'retencion',
  })

  const eficiencia = useQuery({
    queryKey: ['indicadores', 'eficiencia', params],
    queryFn: () => analiticaService.getEficienciaTerminal(params),
    enabled: tab === 'eficiencia',
  })

  const promedio = useQuery({
    queryKey: ['indicadores', 'promedio', params],
    queryFn: () => analiticaService.getPromedio(params),
    enabled: tab === 'promedio',
  })

  const loading = desercion.isLoading || retencion.isLoading || eficiencia.isLoading || promedio.isLoading

  const desercionData: DesercionRow[]         = desercion.data?.data.data ?? []
  const retencionData: RetencionRow[]         = retencion.data?.data.data ?? []
  const eficienciaData: EficienciaTerminalRow[] = eficiencia.data?.data.data ?? []
  const promedioData: PromedioRow[]           = promedio.data?.data.data ?? []

  // Summary metrics
  const avgDesercion = desercionData.length
    ? desercionData.reduce((s: number, r: DesercionRow) => s + r.porcentaje_desercion, 0) / desercionData.length
    : null
  const avgRetencion = retencionData.length
    ? retencionData.reduce((s: number, r: RetencionRow) => s + r.porcentaje_retencion, 0) / retencionData.length
    : null
  const avgEficiencia = eficienciaData.length
    ? eficienciaData.reduce((s: number, r: EficienciaTerminalRow) => s + r.pct_eficiencia, 0) / eficienciaData.length
    : null
  const avgPromedio = promedioData.length
    ? promedioData.reduce((s: number, r: PromedioRow) => s + Number(r.promedio_general), 0) / promedioData.length
    : null

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Indicadores KPI</h1>
        <p className="text-sm text-slate-500 mt-1">Inteligencia Analítica — datos en tiempo real</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Deserción promedio"    value={pct(avgDesercion)}  sub="periodos filtrados" />
        <Metric label="Retención promedio"    value={pct(avgRetencion)}  sub="periodos filtrados" />
        <Metric label="Eficiencia terminal"   value={pct(avgEficiencia)} sub="generaciones filtradas" />
        <Metric label="Promedio institucional" value={avgPromedio != null ? avgPromedio.toFixed(2) : '—'} sub="calificaciones registradas" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          placeholder="ID Carrera (UUID)"
          value={carreraId}
          onChange={e => setCarreraId(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          placeholder="ID Periodo (UUID)"
          value={periodoId}
          onChange={e => setPeriodoId(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-28"
          placeholder="Generación (año)"
          value={generacion}
          onChange={e => setGeneracion(e.target.value)}
        />
        <button
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200"
          onClick={() => { setCarreraId(''); setPeriodoId(''); setGeneracion('') }}
        >
          Limpiar
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </nav>
      </div>

      {loading && (
        <p className="text-sm text-slate-400">Cargando datos...</p>
      )}

      {/* Deserción */}
      {tab === 'desercion' && !loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <Th>Carrera</Th>
                <Th>Periodo</Th>
                <Th>Inscritos</Th>
                <Th>Desertores</Th>
                <Th>% Deserción</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {desercionData.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-400">Sin datos</td></tr>
              )}
              {desercionData.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td bold>{r.carrera}</Td>
                  <Td>{r.periodo}</Td>
                  <Td>{r.total_inscritos}</Td>
                  <Td>{r.total_desertores}</Td>
                  <Td bold>{pct(r.porcentaje_desercion)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Retención */}
      {tab === 'retencion' && !loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <Th>Carrera</Th>
                <Th>Periodo anterior</Th>
                <Th>Periodo actual</Th>
                <Th>Inscritos ant.</Th>
                <Th>Inscritos act.</Th>
                <Th>% Retención</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {retencionData.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">Sin datos</td></tr>
              )}
              {retencionData.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td bold>{r.carrera_id}</Td>
                  <Td>{r.periodo_anterior}</Td>
                  <Td>{r.periodo_actual}</Td>
                  <Td>{r.inscritos_periodo_ant}</Td>
                  <Td>{r.inscritos_periodo_act}</Td>
                  <Td bold>{pct(r.porcentaje_retencion)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Eficiencia Terminal */}
      {tab === 'eficiencia' && !loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <Th>Carrera</Th>
                <Th>Generación</Th>
                <Th>Total ingreso</Th>
                <Th>Egresados</Th>
                <Th>Titulados</Th>
                <Th>% Eficiencia</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {eficienciaData.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">Sin datos</td></tr>
              )}
              {eficienciaData.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td bold>{r.carrera}</Td>
                  <Td>{r.generacion}</Td>
                  <Td>{r.total_ingreso}</Td>
                  <Td>{r.total_egresados}</Td>
                  <Td>{r.total_titulados}</Td>
                  <Td bold>{pct(r.pct_eficiencia)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Promedio */}
      {tab === 'promedio' && !loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <Th>Carrera</Th>
                <Th>Periodo</Th>
                <Th>Calificaciones</Th>
                <Th>Promedio General</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {promedioData.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-400">Sin datos</td></tr>
              )}
              {promedioData.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <Td bold>{r.carrera}</Td>
                  <Td>{r.periodo}</Td>
                  <Td>{r.total_calificaciones}</Td>
                  <Td bold>{Number(r.promedio_general).toFixed(2)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
