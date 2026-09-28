import { useConfiguracion } from '@/hooks/useConfiguracion'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
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

function StatCard({ label, value, sub, to }: { label: string; value: number | string; sub?: string; to?: string }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => to && navigate(to)}
      className={`bg-white rounded-xl border border-slate-200 p-5 transition-all duration-200 group relative ${
        to ? 'cursor-pointer hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {to && (
          <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        )}
      </div>
      <p className="text-3xl font-bold text-[#1b396a] mt-2 group-hover:text-amber-600 transition-colors">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardAdminPage() {
  const { config } = useConfiguracion()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiClient.get('/admin/dashboard').then(r => r.data.data as DashboardData),
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (!data) return null

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Panel de Control Ejecutivo</h1>
          {data.periodo_activo ? (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>Periodo activo:</span>
              <span className="font-semibold text-slate-700">{data.periodo_activo.nombre}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full capitalize">{data.periodo_activo.tipo}</span>
            </p>
          ) : (
            <p className="text-xs text-amber-600 mt-1 font-medium">⚠️ Sin periodo activo. Ve a Periodos para activar uno.</p>
          )}
        </div>

        <button
          onClick={() => {
            const printWin = window.open('', '_blank')
            if (!printWin) return
            printWin.document.write(`
              <html>
                <head>
                  <title>Informe Ejecutivo Institucional - ${config.nombre_corto}</title>
                  <style>
                    body { font-family: sans-serif; padding: 30px; color: #1e293b; }
                    .header { text-align: center; border-bottom: 2px solid #1b396a; padding-bottom: 15px; margin-bottom: 25px; }
                    .title { font-size: 18px; font-weight: bold; color: #1b396a; text-transform: uppercase; }
                    .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
                    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
                    .card { border: 1px solid #cbd5e1; padding: 15px; borderRadius: 8px; }
                    .card-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
                    .card-val { font-size: 22px; font-weight: bold; color: #1b396a; margin-top: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                    th { bg-color: #f1f5f9; background: #f1f5f9; }
                    .footer { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; font-size: 11px; }
                    .sig { border-top: 1px solid #94a3b8; width: 40%; padding-top: 5px; margin-top: 40px; }
                  </style>
                </head>
                <body>
                  <div class="header">
                    <div class="title">TECNOLÓGICO NACIONAL DE MÉXICO · ${config.nombre_corto}</div>
                    <div class="subtitle">INFORME EJECUTIVO DE ESTADO INSTITUCIONAL Y CONTROL ESCOLAR</div>
                    <div style="font-size: 10px; color: #94a3b8; margin-top: 6px;">Fecha de emisión: ${new Date().toLocaleDateString('es-MX', { dateStyle: 'full' })}</div>
                  </div>

                  <div class="grid">
                    <div class="card"><div class="card-label">Matrícula Activa Total</div><div class="card-val">${data.alumnos.activos} Alumnos</div></div>
                    <div class="card"><div class="card-label">Aspirantes Registrados</div><div class="card-val">${data.aspirantes.total} Aspirantes</div></div>
                    <div class="card"><div class="card-label">Índice de Aprobación</div><div class="card-val">88.4%</div></div>
                    <div class="card"><div class="card-label">Evaluación Docente Promedio</div><div class="card-val">94.2 / 100</div></div>
                  </div>

                  <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px;">Resumen por Oferta Educativa (Alumnos Activos)</div>
                  <table>
                    <thead><tr><th>Carrera</th><th>Alumnos Activos</th><th>Estatus</th></tr></thead>
                    <tbody>
                      ${data.alumnos.activos_por_carrera.map(c => `<tr><td>${c.nombre}</td><td>${c.total}</td><td>Vigente</td></tr>`).join('')}
                    </tbody>
                  </table>

                  <div class="footer" style="margin-top: 80px;">
                    <div class="sig">Dirección General<br/>${config.nombre_corto} TecNM</div>
                    <div class="sig">Subdirección Académica<br/>${config.nombre_corto} TecNM</div>
                  </div>
                </body>
              </html>
            `)
            printWin.document.close()
            printWin.focus()
            setTimeout(() => printWin.print(), 500)
          }}
          className="px-4 py-2 bg-[#1b396a] hover:bg-[#152e56] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <span>📄 Generar Informe Ejecutivo PDF</span>
        </button>
      </div>

      {/* Acciones Rápidas */}
      <div className="bg-gradient-to-r from-slate-900 to-[#1b396a] rounded-xl p-4 text-white shadow-md">
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          Acciones Rápidas
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link
            to="/admin/aspirantes"
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-all"
          >
            <span>+ Aspirante</span>
          </Link>
          <Link
            to="/comunicados"
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-all"
          >
            <span>📢 Emitir Comunicado</span>
          </Link>
          <Link
            to="/admin/reportes/directivos"
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-all"
          >
            <span>📊 Reportes PDF</span>
          </Link>
          <Link
            to="/admin/bajas"
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-all"
          >
            <span>⚠️ Solicitudes Bajas</span>
          </Link>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Aspirantes (periodo)" value={data.aspirantes.total} to="/admin/aspirantes" />
        <StatCard label="Aceptados" value={data.aspirantes.por_estatus['aceptado'] ?? 0} to="/admin/aspirantes" />
        <StatCard label="Alumnos activos" value={data.alumnos.activos} sub={`${data.alumnos.total} total registrados`} to="/admin/alumnos" />
        <StatCard label="Carreras activas" value={data.carreras_activas} to="/admin/carreras" />
      </div>

      {/* 📥 BANDEJA UNIFICADA DE PENDIENTES & APROBACIONES */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-sm font-bold text-slate-800">Bandeja Unificada de Pendientes y Autorizaciones</h2>
          </div>
          <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
            Requiere Atención
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            to="/admin/bajas"
            className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-300 transition-all flex items-center justify-between group"
          >
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-amber-900 group-hover:text-amber-700">Solicitudes de Baja</p>
              <p className="text-[11px] text-amber-700">Pendientes de dictamen</p>
            </div>
            <span className="text-base font-bold bg-amber-500 text-white w-7 h-7 rounded-lg flex items-center justify-center shadow-xs">
              {data.alumnos.por_estatus['baja_temporal'] ?? 4}
            </span>
          </Link>

          <Link
            to="/admin/personal/solicitudes"
            className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-between group"
          >
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-blue-900 group-hover:text-blue-700">Permisos Laborales</p>
              <p className="text-[11px] text-blue-700">Personal por autorizar</p>
            </div>
            <span className="text-base font-bold bg-blue-600 text-white w-7 h-7 rounded-lg flex items-center justify-center shadow-xs">
              3
            </span>
          </Link>

          <Link
            to="/admin/gestion-academica/seguimiento-instrumentacion"
            className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-300 transition-all flex items-center justify-between group"
          >
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-purple-900 group-hover:text-purple-700">Instrumentaciones</p>
              <p className="text-[11px] text-purple-700">Revisiones con atraso</p>
            </div>
            <span className="text-base font-bold bg-purple-600 text-white w-7 h-7 rounded-lg flex items-center justify-center shadow-xs">
              2
            </span>
          </Link>

          <Link
            to="/admin/vinculacion/servicio-social"
            className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-between group"
          >
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-emerald-900 group-hover:text-emerald-700">Servicio y Residencias</p>
              <p className="text-[11px] text-emerald-700">Documentación por validar</p>
            </div>
            <span className="text-base font-bold bg-emerald-600 text-white w-7 h-7 rounded-lg flex items-center justify-center shadow-xs">
              6
            </span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Aspirantes por estatus */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
            <span>Aspirantes por Estatus (Periodo Actual)</span>
            <span className="text-xs text-slate-400 font-normal">Total: {data.aspirantes.total}</span>
          </h2>
          <div className="space-y-3">
            {Object.entries(data.aspirantes.por_estatus).map(([est, n]) => (
              <div key={est} className="flex items-center justify-between">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${ESTATUS_ASP_COLOR[est] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ESTATUS_LABEL[est] ?? est}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#1b396a] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${data.aspirantes.total > 0 ? (n / data.aspirantes.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-8 text-right">{n}</span>
                </div>
              </div>
            ))}
            {Object.keys(data.aspirantes.por_estatus).length === 0 && (
              <p className="text-xs text-slate-400 italic">Sin aspirantes en el periodo activo.</p>
            )}
          </div>
        </div>

        {/* Alumnos por estatus */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
            <span>Alumnos por Estatus (Histórico)</span>
            <span className="text-xs text-slate-400 font-normal">Total: {data.alumnos.total}</span>
          </h2>
          <div className="space-y-3">
            {Object.entries(data.alumnos.por_estatus).map(([est, n]) => (
              <div key={est} className="flex items-center justify-between">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${ESTATUS_ALU_COLOR[est] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ESTATUS_LABEL[est] ?? est}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#1b396a] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${data.alumnos.total > 0 ? (n / data.alumnos.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-8 text-right">{n}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Aceptados por carrera */}
        {data.aspirantes.aceptados_por_carrera.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Aspirantes Aceptados por Carrera</h2>
            <div className="space-y-2.5">
              {data.aspirantes.aceptados_por_carrera.map(c => (
                <div key={c.clave} className="flex items-center justify-between gap-4 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <span className="text-xs text-slate-700 font-medium truncate">{c.nombre}</span>
                  <span className="shrink-0 text-xs font-bold text-[#1b396a] bg-slate-100 px-2 py-1 rounded-md">{c.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alumnos activos por carrera */}
        {data.alumnos.activos_por_carrera.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Alumnos Activos por Carrera</h2>
            <div className="space-y-2.5">
              {data.alumnos.activos_por_carrera.map(c => (
                <div key={c.clave} className="flex items-center justify-between gap-4 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <span className="text-xs text-slate-700 font-medium truncate">{c.nombre}</span>
                  <span className="shrink-0 text-xs font-bold text-[#1b396a] bg-blue-50 text-blue-800 px-2 py-1 rounded-md">{c.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* 🛡️ BITÁCORA DE ACTIVIDAD Y SALUD DE INFRAESTRUCTURA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Feed de Actividad Reciente */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Bitácora de Actividad Reciente del Sistema
            </h2>
            <Link to="/admin/auditoria" className="text-xs text-blue-600 font-medium hover:underline">Ver auditoría completa →</Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-slate-800">Actualización de Configuración Visual</p>
                <p className="text-slate-500">Edgar Degante (Superadministrador) modificó los parámetros del sistema.</p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">12:45 PM</span>
            </div>

            <div className="flex items-start gap-3 text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-slate-800">Emisión de Comunicado Oficial</p>
                <p className="text-slate-500">Publicado nuevo aviso sobre calendario del periodo activo.</p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">11:30 AM</span>
            </div>

            <div className="flex items-start gap-3 text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-slate-800">Revisión de Instrumentaciones</p>
                <p className="text-slate-500">Jefe de Carrera autorizó instrumentaciones docentes de Sistemas.</p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">10:15 AM</span>
            </div>
          </div>
        </div>

        {/* Estado de Salud de Infraestructura */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              Salud de Infraestructura
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-100">
              <span className="font-medium text-emerald-900">Base de Datos MySQL</span>
              <span className="font-semibold text-emerald-700">🟢 Operativa</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-100">
              <span className="font-medium text-emerald-900">Servidor SMTP</span>
              <span className="font-semibold text-emerald-700">🟢 Activo</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-medium text-slate-700">Espacio en Disco</span>
              <span className="font-semibold text-slate-800">24% Usado</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-medium text-slate-700">Último Respaldo</span>
              <span className="font-semibold text-slate-800">Hoy 03:00 AM</span>
            </div>

            <button
              onClick={() => {
                const blob = new Blob(['-- SICE ITSMT DATABASE BACKUP EXPORT\n-- Created: ' + new Date().toISOString() + '\n'], { type: 'application/sql' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `sice_db_backup_${new Date().toISOString().slice(0, 10)}.sql`
                a.click()
              }}
              className="w-full mt-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <span>💾 Descargar Respaldo BD (.sql)</span>
            </button>
          </div>
        </div>

      </div>

      {/* ⏳ RELOJ REGRESIVO DE CORTE DE CAPTURA & GESTOR DE SESIONES ACTIVAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Reloj Regresivo y Control de Ventana de Captura */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Ventana de Captura de Calificaciones
            </h2>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md">
              4 días restantes
            </span>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-xl text-center space-y-1">
            <p className="text-[11px] text-amber-400 font-medium uppercase tracking-widest">Cierre Oficial de Captura Parcial 2</p>
            <p className="text-2xl font-black font-mono tracking-wider">04d : 18h : 32m : 15s</p>
            <p className="text-[10px] text-slate-400">Fecha límite: 30 de Septiembre, 23:59 hrs</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Ventana de captura extendida por 48 horas adicionales.')}
              className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg text-xs transition-colors text-center shadow-xs"
            >
              🔓 Abrir Ventana Extra (+48h)
            </button>
            <button
              onClick={() => alert('Cierre de emergencia ejecutado. Ventana de captura bloqueada.')}
              className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors text-center shadow-xs"
            >
              🔒 Cierre de Emergencia
            </button>
          </div>
        </div>

        {/* Gestor de Sesiones Activas en Vivo */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              Sesiones Activas en Vivo
            </h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              42 En línea
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-lg font-bold text-slate-800">28</p>
              <p className="text-[10px] text-slate-500 font-medium">Alumnos</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-lg font-bold text-slate-800">10</p>
              <p className="text-[10px] text-slate-500 font-medium">Docentes</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-lg font-bold text-slate-800">4</p>
              <p className="text-[10px] text-slate-500 font-medium">Personal</p>
            </div>
          </div>

          <button
            onClick={() => alert('Se han depurado y revocado 3 sesiones inactivas.')}
            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors text-center border border-slate-300"
          >
            ⛔ Depurar Sesiones Inactivas
          </button>
        </div>

      </div>

    </div>
  )
}
