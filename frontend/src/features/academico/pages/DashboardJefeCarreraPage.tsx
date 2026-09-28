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
  inscrito:  'bg-brand-100 text-brand-700',
}
const ESTATUS_ALU_COLOR: Record<string, string> = {
  activo:          'bg-emerald-100 text-emerald-700',
  baja_temporal:   'bg-amber-100 text-amber-700',
  baja_definitiva: 'bg-red-100 text-red-700',
  egresado:        'bg-brand-100 text-brand-700',
  titulado:        'bg-purple-100 text-purple-700',
}
const ESTATUS_INST_COLOR: Record<string, string> = {
  borrador:      'bg-slate-100 text-slate-600',
  enviada:       'bg-brand-100 text-brand-700',
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
      <p className="text-3xl font-bold text-brand-600">{value}</p>
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
                  <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: `${total > 0 ? (n / total) * 100 : 0}%` }} />
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

      {/* Panel Normativo Oficio Circular DET/ITSMT/DA/0041/2026 */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800">
              Normativa Institucional TecNM
            </span>
            <h3 className="text-base font-bold mt-1 text-white">
              Cumplimiento Académico — Oficio Circular DET/ITSMT/DA/0041/2026
            </h3>
          </div>
          <Link
            to="/comunicados/oficio-circular"
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1 shrink-0"
          >
            📜 Ver Oficio & Acuses
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <Link
            to="/admin/gestion-academica/seguimiento-instrumentacion"
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors block"
          >
            <div className="font-bold text-amber-300">Formatos SGI G4 (F-03-01 a F-03-07)</div>
            <div className="text-slate-400 text-[11px] mt-1">Supervisar avance programático y autorizaciones de exámenes.</div>
          </Link>
          <Link
            to="/gestion-academica/alertas-corte-captura"
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors block"
          >
            <div className="font-bold text-emerald-300">Fechas de los 3 Cortes de Captura</div>
            <div className="text-slate-400 text-[11px] mt-1">Corte 1 (21-25 sep), Corte 2 (26 oct-4 nov), Corte 3 (7-11 dic).</div>
          </Link>
          <Link
            to="/academico/alertas"
            className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors block"
          >
            <div className="font-bold text-red-300">Canalizaciones F-05-04 a Tutorías</div>
            <div className="text-slate-400 text-[11px] mt-1">Revisar estudiantes con inasistencia &ge; 50% o riesgo de reprobación.</div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Desglose title="Aspirantes por estatus (periodo actual)" data={data.aspirantes.por_estatus} colors={ESTATUS_ASP_COLOR} />
        <Desglose title="Alumnos por estatus (total histórico)" data={data.alumnos.por_estatus} colors={ESTATUS_ALU_COLOR} />
        <Desglose title="Instrumentaciones didácticas por estatus" data={data.instrumentaciones_por_estatus} colors={ESTATUS_INST_COLOR} />
      </div>
    </div>
  )
}
