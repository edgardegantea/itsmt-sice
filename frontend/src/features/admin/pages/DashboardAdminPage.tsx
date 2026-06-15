import { useQuery } from '@tanstack/react-query'
import apiClient from '../../../config/apiClient'

interface DashboardData {
  periodo_activo: { id: string; nombre: string; tipo: string } | null
  aspirantes: {
    total: number
    por_estatus: Record<string, number>
    aceptados_por_carrera: { nombre: string; clave: string; total: number }[]
  }
  alumnos: {
    total: number
    activos: number
    por_estatus: Record<string, number>
    activos_por_carrera: { nombre: string; clave: string; total: number }[]
  }
  carreras_activas: number
}

const ESTATUS_ASP_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  aceptado:  'bg-emerald-100 text-emerald-700',
  rechazado: 'bg-red-100 text-red-700',
  inscrito:  'bg-blue-100 text-blue-700',
}
const ESTATUS_ALU_COLOR: Record<string, string> = {
  activo:          'bg-emerald-100 text-emerald-700',
  baja_temporal:   'bg-amber-100 text-amber-700',
  baja_definitiva: 'bg-red-100 text-red-700',
  egresado:        'bg-blue-100 text-blue-700',
  titulado:        'bg-purple-100 text-purple-700',
}
const ESTATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', aceptado: 'Aceptado', rechazado: 'Rechazado', inscrito: 'Inscrito',
  activo: 'Activo', baja_temporal: 'Baja temporal', baja_definitiva: 'Baja definitiva',
  egresado: 'Egresado', titulado: 'Titulado',
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-[#1a3a5c]">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardAdminPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiClient.get('/admin/dashboard').then(r => r.data.data as DashboardData),
  })

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Cargando métricas…</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-8">

      {/* Encabezado */}
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Panel de Control</h1>
        {data.periodo_activo ? (
          <p className="text-sm text-slate-500 mt-0.5">
            Periodo activo: <span className="font-medium text-slate-700">{data.periodo_activo.nombre}</span>
            <span className="ml-2 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full capitalize">{data.periodo_activo.tipo}</span>
          </p>
        ) : (
          <p className="text-sm text-amber-600 mt-0.5">Sin periodo activo. Ve a Periodos para activar uno.</p>
        )}
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Aspirantes (periodo)" value={data.aspirantes.total} />
        <StatCard label="Aceptados" value={data.aspirantes.por_estatus['aceptado'] ?? 0} />
        <StatCard label="Alumnos activos" value={data.alumnos.activos} sub={`${data.alumnos.total} total registrados`} />
        <StatCard label="Carreras activas" value={data.carreras_activas} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Aspirantes por estatus */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Aspirantes por estatus (periodo actual)</h2>
          <div className="space-y-2">
            {Object.entries(data.aspirantes.por_estatus).map(([est, n]) => (
              <div key={est} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTATUS_ASP_COLOR[est] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ESTATUS_LABEL[est] ?? est}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-[#1a3a5c] h-1.5 rounded-full"
                      style={{ width: `${data.aspirantes.total > 0 ? (n / data.aspirantes.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-6 text-right">{n}</span>
                </div>
              </div>
            ))}
            {Object.keys(data.aspirantes.por_estatus).length === 0 && (
              <p className="text-xs text-slate-400">Sin aspirantes en el periodo activo.</p>
            )}
          </div>
        </div>

        {/* Alumnos por estatus */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Alumnos por estatus (total histórico)</h2>
          <div className="space-y-2">
            {Object.entries(data.alumnos.por_estatus).map(([est, n]) => (
              <div key={est} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTATUS_ALU_COLOR[est] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ESTATUS_LABEL[est] ?? est}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-[#1a3a5c] h-1.5 rounded-full"
                      style={{ width: `${data.alumnos.total > 0 ? (n / data.alumnos.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-6 text-right">{n}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Aceptados por carrera */}
        {data.aspirantes.aceptados_por_carrera.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Aspirantes aceptados por carrera</h2>
            <div className="space-y-2">
              {data.aspirantes.aceptados_por_carrera.map(c => (
                <div key={c.clave} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600 truncate">{c.nombre}</span>
                  <span className="shrink-0 text-sm font-semibold text-[#1a3a5c]">{c.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alumnos activos por carrera */}
        {data.alumnos.activos_por_carrera.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Alumnos activos por carrera</h2>
            <div className="space-y-2">
              {data.alumnos.activos_por_carrera.map(c => (
                <div key={c.clave} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600 truncate">{c.nombre}</span>
                  <span className="shrink-0 text-sm font-semibold text-[#1a3a5c]">{c.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
