import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import apiClient from '../../../config/apiClient'
import { useAuthStore } from '../../../store/authStore'

interface DashboardData {
  periodo_activo: { id: string; nombre: string; tipo: string } | null
  aspirantes: {
    total: number
    por_estatus: Record<string, number>
  }
  alumnos: {
    total: number
    activos: number
    por_estatus: Record<string, number>
  }
  docentes_total: number
  materias_total: number
  grupos_total: number
  instrumentaciones_por_estatus: Record<string, number>
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
const ESTATUS_INST_COLOR: Record<string, string> = {
  borrador:      'bg-slate-100 text-slate-600',
  enviada:       'bg-blue-100 text-blue-700',
  observaciones: 'bg-yellow-100 text-yellow-700',
  enviada_jc:    'bg-indigo-100 text-indigo-700',
  liberada:      'bg-green-100 text-green-700',
  vigente:       'bg-emerald-100 text-emerald-700',
}
const ESTATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', aceptado: 'Aceptado', rechazado: 'Rechazado', inscrito: 'Inscrito',
  activo: 'Activo', baja_temporal: 'Baja temporal', baja_definitiva: 'Baja definitiva',
  egresado: 'Egresado', titulado: 'Titulado',
  borrador: 'Borrador', enviada: 'En revisión (DA)', observaciones: 'Con observaciones',
  enviada_jc: 'En revisión (Jefatura)', liberada: 'Liberada', vigente: 'Vigente',
}

function StatCard({ label, value, to }: { label: string; value: number | string; to?: string }) {
  const content = (
    <div className="bg-white rounded-xl border border-slate-200 p-5 h-full hover:border-slate-300 transition-colors">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-[#1a3a5c]">{value}</p>
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

function Desglose({ title, data, colors }: { title: string; data: Record<string, number>; colors: Record<string, string> }) {
  const total = Object.values(data).reduce((s, n) => s + n, 0)
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">{title}</h2>
      {Object.keys(data).length === 0 ? (
        <p className="text-xs text-slate-400">Sin registros.</p>
      ) : (
        <div className="space-y-2">
          {Object.entries(data).map(([est, n]) => (
            <div key={est} className="flex items-center justify-between">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[est] ?? 'bg-slate-100 text-slate-600'}`}>
                {ESTATUS_LABEL[est] ?? est}
              </span>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-slate-100 rounded-full h-1.5">
                  <div className="bg-[#1a3a5c] h-1.5 rounded-full" style={{ width: `${total > 0 ? (n / total) * 100 : 0}%` }} />
                </div>
                <span className="text-sm font-medium text-slate-700 w-6 text-right">{n}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardJefeCarreraPage() {
  const user = useAuthStore(s => s.user)

  const { data, isLoading } = useQuery({
    queryKey: ['jefe-carrera-dashboard'],
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
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Panel de {user?.carrera?.nombre ?? 'mi carrera'}</h1>
        {data.periodo_activo ? (
          <p className="text-sm text-slate-500 mt-0.5">
            Periodo activo: <span className="font-medium text-slate-700">{data.periodo_activo.nombre}</span>
            <span className="ml-2 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full capitalize">{data.periodo_activo.tipo}</span>
          </p>
        ) : (
          <p className="text-sm text-amber-600 mt-0.5">Sin periodo activo.</p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Aspirantes (periodo)" value={data.aspirantes.total} to="/admin/aspirantes" />
        <StatCard label="Alumnos activos" value={data.alumnos.activos} to="/admin/alumnos" />
        <StatCard label="Docentes" value={data.docentes_total} />
        <StatCard label="Materias" value={data.materias_total} to="/admin/catalogos" />
        <StatCard label="Grupos" value={data.grupos_total} />
        <StatCard label="Instrumentaciones" value={Object.values(data.instrumentaciones_por_estatus).reduce((s, n) => s + n, 0)} to="/admin/planeacion/instrumentaciones" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Desglose title="Aspirantes por estatus (periodo actual)" data={data.aspirantes.por_estatus} colors={ESTATUS_ASP_COLOR} />
        <Desglose title="Alumnos por estatus (total histórico)" data={data.alumnos.por_estatus} colors={ESTATUS_ALU_COLOR} />
        <Desglose title="Instrumentaciones didácticas por estatus" data={data.instrumentaciones_por_estatus} colors={ESTATUS_INST_COLOR} />
      </div>
    </div>
  )
}
