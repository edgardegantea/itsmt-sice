import { useConfiguracion } from '@/hooks/useConfiguracion'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  UserPlus, Megaphone, FileBarChart, UserMinus, Printer, ChevronRight, History, CalendarRange,
  AlertTriangle, CheckCircle2, CalendarX2, NotebookPen, HandHelping, RefreshCw, type LucideIcon,
} from 'lucide-react'
import apiClient from '../../../config/apiClient'
import { DashboardSkeleton } from '../../../components/Skeleton'

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
  pendientes: { bajas: number; permisos_personal: number | null; planeaciones: number; servicio_social: number }
  actividad: { id: string; usuario: string; metodo: string; ruta: string; entidad: string | null; fecha: string }[]
}

const ESTATUS_ASP_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-500', aceptado: 'bg-emerald-500', rechazado: 'bg-red-500', inscrito: 'bg-brand-600',
}
const ESTATUS_ALU_COLOR: Record<string, string> = {
  activo: 'bg-emerald-500', baja_temporal: 'bg-amber-500', baja_definitiva: 'bg-red-500',
  egresado: 'bg-brand-600', titulado: 'bg-purple-500',
}
const ESTATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', aceptado: 'Aceptado', rechazado: 'Rechazado', inscrito: 'Inscrito',
  activo: 'Activo', baja_temporal: 'Baja temporal', baja_definitiva: 'Baja definitiva',
  egresado: 'Egresado', titulado: 'Titulado',
}
const ACCION_LABEL: Record<string, string> = { POST: 'Creó', PUT: 'Actualizó', PATCH: 'Actualizó', DELETE: 'Eliminó' }

const ACCIONES: { to: string; label: string; icono: LucideIcon }[] = [
  { to: '/admin/aspirantes', label: 'Aspirantes', icono: UserPlus },
  { to: '/comunicados', label: 'Emitir comunicado', icono: Megaphone },
  { to: '/admin/reportes/directivos', label: 'Reportes PDF', icono: FileBarChart },
  { to: '/admin/bajas', label: 'Solicitudes de baja', icono: UserMinus },
]

function horaRelativa(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function StatCard({ label, value, sub, to }: { label: string; value: number | string; sub?: string; to?: string }) {
  const contenido = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {to && <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 transition-colors" aria-hidden="true" />}
      </div>
      <p className="text-3xl font-bold text-brand-600 mt-2 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </>
  )
  const clase = 'block bg-white rounded-xl border border-slate-200 p-5 transition-all group'
  return to
    ? <Link to={to} className={`${clase} hover:border-slate-300 hover:shadow-md`}>{contenido}</Link>
    : <div className={clase}>{contenido}</div>
}

/** Barras horizontales de distribución por estatus. */
function Distribucion({ datos, total, colores, vacio }: {
  datos: Record<string, number>; total: number; colores: Record<string, string>; vacio: string
}) {
  const filas = Object.entries(datos).sort((a, b) => b[1] - a[1])
  if (!filas.length) return <p className="text-xs text-slate-400 italic">{vacio}</p>
  return (
    <ul className="space-y-3">
      {filas.map(([est, n]) => (
        <li key={est}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-700 font-medium">{ESTATUS_LABEL[est] ?? est}</span>
            <span className="tabular-nums text-slate-500"><strong className="text-slate-800">{n}</strong> · {total ? Math.round((n / total) * 100) : 0}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${colores[est] ?? 'bg-slate-400'}`} style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function DashboardAdminPage() {
  const { config } = useConfiguracion()
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiClient.get('/admin/dashboard').then(r => r.data.data as DashboardData),
    // Los conteos cambian poco: se reutilizan al volver al panel y se refrescan en segundo plano.
    staleTime: 60_000,
  })

  if (isLoading) return <DashboardSkeleton />
  if (isError || !data) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between gap-4">
          No se pudo cargar el panel.
          <button type="button" onClick={() => refetch()} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-red-200 hover:bg-red-100">Reintentar</button>
        </div>
      </div>
    )
  }

  const pendientes: { to: string; label: string; detalle: string; n: number; icono: LucideIcon }[] = [
    { to: '/admin/bajas', label: 'Solicitudes de baja', detalle: 'Pendientes de dictamen', n: data.pendientes.bajas, icono: UserMinus },
    ...(data.pendientes.permisos_personal !== null
      ? [{ to: '/admin/personal/solicitudes', label: 'Permisos laborales', detalle: 'Personal por autorizar', n: data.pendientes.permisos_personal, icono: CalendarX2 }]
      : []),
    { to: '/admin/gestion-academica/planeaciones', label: 'Planeaciones', detalle: 'Enviadas a revisión', n: data.pendientes.planeaciones, icono: NotebookPen },
    { to: '/admin/vinculacion/servicio-social', label: 'Servicio social', detalle: 'Solicitudes por validar', n: data.pendientes.servicio_social, icono: HandHelping },
  ]
  const totalPendientes = pendientes.reduce((s, p) => s + p.n, 0)

  const imprimirInforme = () => {
    const win = window.open('', '_blank')
    if (!win) return
    const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
    win.document.write(`<html><head><title>Informe ejecutivo - ${esc(config.nombre_corto)}</title><style>
      body{font-family:Arial,sans-serif;padding:30px;color:#1e293b}
      .h{text-align:center;border-bottom:2px solid #1b396a;padding-bottom:12px;margin-bottom:22px}
      .t{font-size:17px;font-weight:bold;color:#1b396a;text-transform:uppercase}.s{font-size:12px;color:#64748b;margin-top:4px}
      .g{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:22px}.c{border:1px solid #cbd5e1;padding:12px;border-radius:8px}
      .l{font-size:10px;color:#64748b;text-transform:uppercase;font-weight:bold}.v{font-size:22px;font-weight:bold;color:#1b396a;margin-top:4px}
      table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left}th{background:#f1f5f9}
      .f{margin-top:80px;display:flex;justify-content:space-between;text-align:center;font-size:11px}.sig{border-top:1px solid #94a3b8;width:40%;padding-top:5px}
    </style></head><body>
      <div class="h"><div class="t">Tecnológico Nacional de México · ${esc(config.nombre_institucion)}</div>
        <div class="s">Informe ejecutivo de control escolar${data.periodo_activo ? ` · Periodo ${esc(data.periodo_activo.nombre)}` : ''}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:6px">Emitido el ${new Date().toLocaleDateString('es-MX', { dateStyle: 'full' })}</div></div>
      <div class="g">
        <div class="c"><div class="l">Alumnos activos</div><div class="v">${data.alumnos.activos}</div></div>
        <div class="c"><div class="l">Aspirantes del periodo</div><div class="v">${data.aspirantes.total}</div></div>
        <div class="c"><div class="l">Aspirantes aceptados</div><div class="v">${data.aspirantes.por_estatus['aceptado'] ?? 0}</div></div>
        <div class="c"><div class="l">Carreras activas</div><div class="v">${data.carreras_activas}</div></div>
      </div>
      <p style="font-size:12px;font-weight:bold;margin-bottom:6px">Alumnos activos por carrera</p>
      <table><thead><tr><th>Carrera</th><th>Clave</th><th>Alumnos activos</th></tr></thead><tbody>
        ${data.alumnos.activos_por_carrera.map(c => `<tr><td>${esc(c.nombre)}</td><td>${esc(c.clave)}</td><td>${c.total}</td></tr>`).join('')}
      </tbody></table>
      <div class="f"><div class="sig">Dirección General</div><div class="sig">Subdirección Académica</div></div>
    </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Panel principal</h1>
          {data.periodo_activo ? (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <CalendarRange className="w-3.5 h-3.5" aria-hidden="true" />
              Periodo activo: <span className="font-semibold text-slate-700">{data.periodo_activo.nombre}</span>
            </p>
          ) : (
            <p className="text-xs text-amber-700 mt-1 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              Sin periodo activo. <Link to="/admin/periodos" className="underline">Activa uno en Periodos</Link>.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => refetch()} disabled={isFetching} title="Actualizar"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
          <button type="button" onClick={imprimirInforme}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-2">
            <Printer className="w-4 h-4" aria-hidden="true" />
            Informe ejecutivo
          </button>
        </div>
      </div>

      {/* Accesos rápidos */}
      <nav className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" aria-label="Accesos rápidos">
        {ACCIONES.map(a => {
          const Icono = a.icono
          return (
            <Link key={a.to} to={a.to}
              className="flex items-center gap-2.5 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:border-brand-600/40 hover:text-brand-600 transition-colors">
              <Icono className="w-4 h-4 text-brand-600" aria-hidden="true" />
              {a.label}
            </Link>
          )
        })}
      </nav>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Aspirantes (periodo)" value={data.aspirantes.total} to="/admin/aspirantes" />
        <StatCard label="Aceptados" value={data.aspirantes.por_estatus['aceptado'] ?? 0} to="/admin/aspirantes" />
        <StatCard label="Alumnos activos" value={data.alumnos.activos} sub={`${data.alumnos.total} registrados en total`} to="/admin/alumnos" />
        <StatCard label="Carreras activas" value={data.carreras_activas} to="/admin/carreras" />
      </div>

      {/* Pendientes reales */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800">Pendientes por atender</h2>
          {totalPendientes === 0
            ? <span className="text-xs text-emerald-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Al día</span>
            : <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 font-semibold px-2.5 py-0.5 rounded-full">{totalPendientes} en total</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pendientes.map(p => {
            const Icono = p.icono
            return (
              <Link key={p.to} to={p.to}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                  p.n ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300' : 'border-slate-200 hover:border-slate-300'
                }`}>
                <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${p.n ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                  <Icono className="w-4.5 h-4.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-slate-800">{p.label}</span>
                  <span className="block text-[11px] text-slate-500">{p.detalle}</span>
                </span>
                <span className={`text-lg font-bold tabular-nums ${p.n ? 'text-amber-700' : 'text-slate-300'}`}>{p.n}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Distribuciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
            Aspirantes por estatus <span className="text-xs text-slate-400 font-normal">Periodo actual · {data.aspirantes.total}</span>
          </h2>
          <Distribucion datos={data.aspirantes.por_estatus} total={data.aspirantes.total} colores={ESTATUS_ASP_COLOR} vacio="Sin aspirantes en el periodo activo." />
        </section>
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
            Alumnos por estatus <span className="text-xs text-slate-400 font-normal">Histórico · {data.alumnos.total}</span>
          </h2>
          <Distribucion datos={data.alumnos.por_estatus} total={data.alumnos.total} colores={ESTATUS_ALU_COLOR} vacio="Sin alumnos registrados." />
        </section>

        {[
          { titulo: 'Aspirantes aceptados por carrera', filas: data.aspirantes.aceptados_por_carrera },
          { titulo: 'Alumnos activos por carrera', filas: data.alumnos.activos_por_carrera },
        ].filter(b => b.filas.length).map(b => (
          <section key={b.titulo} className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3">{b.titulo}</h2>
            <ul className="divide-y divide-slate-100">
              {b.filas.map(c => (
                <li key={c.clave} className="flex items-center justify-between gap-4 py-2">
                  <span className="text-xs text-slate-700 truncate">{c.nombre}</span>
                  <span className="shrink-0 text-xs font-bold text-brand-600 tabular-nums">{c.total}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Actividad reciente (bitácora de auditoría real; solo administración) */}
      {data.actividad.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" aria-hidden="true" /> Actividad reciente
            </h2>
            <Link to="/admin/auditoria" className="text-xs text-brand-600 font-medium hover:underline">Ver auditoría completa</Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.actividad.map(a => (
              <li key={a.id} className="flex items-center gap-3 py-2 text-xs">
                <span className={`shrink-0 w-2 h-2 rounded-full ${a.metodo === 'DELETE' ? 'bg-red-500' : a.metodo === 'POST' ? 'bg-emerald-500' : 'bg-brand-600'}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold text-slate-800">{a.usuario}</span>{' '}
                  <span className="text-slate-500">{(ACCION_LABEL[a.metodo] ?? a.metodo).toLowerCase()}</span>{' '}
                  <code className="text-[11px] text-slate-600">{a.ruta}</code>
                </span>
                <span className="shrink-0 text-[11px] text-slate-400" title={new Date(a.fecha).toLocaleString('es-MX')}>{horaRelativa(a.fecha)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
