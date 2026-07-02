import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import { academicoApi, type SituacionAcademica } from '../../academico/services/academico'

const ESTATUS_COLOR: Record<string, string> = {
  activo:          'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  baja_temporal:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  baja_definitiva: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  egresado:        'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  titulado:        'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
}

const ESTATUS_LABEL: Record<string, string> = {
  activo:          'Activo',
  baja_temporal:   'Baja temporal',
  baja_definitiva: 'Baja definitiva',
  egresado:        'Egresado',
  titulado:        'Titulado',
}

const ACCESOS_RAPIDOS = [
  { to: '/alumno/tramites',                  label: 'Trámites',              desc: 'Reinscripción, bajas, constancias' },
  { to: '/alumno/precarga-academica',        label: 'Precarga Académica',    desc: 'Selecciona tus materias' },
  { to: '/alumno/vinculacion',               label: 'SS y Residencia',       desc: 'Servicio Social y Residencia Profesional' },
  { to: '/alumno/titulacion',                label: 'Titulación',            desc: 'Opciones y seguimiento' },
  { to: '/alumno/convocatorias',             label: 'Convocatorias',         desc: 'Becas, movilidad y más' },
  { to: '/alumno/evaluacion-docente',        label: 'Evaluar Docentes',      desc: 'Encuesta de desempeño docente' },
]

export default function DashboardAlumnoPage() {
  const { user } = useAuthStore()

  const { data: situacion } = useQuery<SituacionAcademica>({
    queryKey: ['situacion-academica', user?.alumno_id],
    queryFn: () => academicoApi.getSituacionAcademica(user!.alumno_id!),
    enabled: !!user?.alumno_id,
    staleTime: 5 * 60 * 1000,
  })

  const estatus = user?.estatus ?? 'activo'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-1">
            Bienvenido/a
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 leading-tight">
            {user?.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-sm text-slate-500 font-mono">{user?.numero_control}</span>
            {user?.estatus && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
                {ESTATUS_LABEL[estatus] ?? estatus}
              </span>
            )}
            {user?.pendiente_certificado_bachillerato && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                Cert. bachillerato pendiente
              </span>
            )}
          </div>
        </div>

        {/* Credencial */}
        {/* <button
          onClick={handleCredencial}
          disabled={!!generandoCredencial || !user?.alumno_id}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primario, #1a3a5c)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c0 1.306.835 2.417 2 2.83V18m-2-2.83A2.67 2.67 0 006 18" />
          </svg>
          {generandoCredencial ? 'Generando…' : 'Credencial PDF'}
        </button> */}
      </div>

      {/* ── Datos académicos ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Carrera',      value: (user?.carrera as unknown as string) ?? '—',  mono: false },
          { label: 'Semestre',     value: user?.semestre ? `${user.semestre}°` : '—',   mono: false },
          { label: 'N/C',          value: user?.numero_control ?? '—',                   mono: true  },
          { label: 'Ingreso',      value: user?.periodo_ingreso ?? '—',                  mono: false },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              {item.label}
            </p>
            <p className={`text-sm font-semibold text-slate-800 truncate ${item.mono ? 'font-mono' : ''}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Calificaciones recientes ──────────────────────────────────── */}
      {situacion && situacion.calificaciones.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Calificaciones
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Materia</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Periodo</th>
                  <th className="px-5 py-3 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cal.</th>
                  <th className="px-5 py-3 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {situacion.calificaciones.map(cal => {
                  const materia = cal.grupo?.cargas?.[0]?.materia?.nombre ?? '—'
                  const periodo = cal.grupo?.periodo?.nombre ?? '—'
                  return (
                    <tr key={cal.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 text-slate-700 font-medium">{materia}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs hidden sm:table-cell">{periodo}</td>
                      <td className="px-5 py-3 text-center font-semibold text-slate-800">
                        {cal.promedio ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {cal.acreditado === true && (
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Acreditado
                          </span>
                        )}
                        {cal.acreditado === false && (
                          <span className="text-[11px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            No acreditado
                          </span>
                        )}
                        {(cal.acreditado === null || cal.acreditado === undefined) && (
                          <span className="text-[11px] text-slate-300">Pendiente</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Accesos rápidos ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACCESOS_RAPIDOS.map(({ to, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="group bg-white rounded-xl border border-slate-200 px-5 py-4 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <p className="text-sm font-semibold text-slate-800 group-hover:text-[#1a3a5c] transition-colors">
                {label}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Alerta observaciones ─────────────────────────────────────── */}
      {user?.observaciones_estatus && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-amber-800 mb-1">Nota de Control Escolar</p>
          <p className="text-sm text-amber-700">{user.observaciones_estatus}</p>
        </div>
      )}

      {/* ── Contacto ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap gap-6">
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Correo</p>
          <p className="text-sm text-slate-700">{user?.email}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Contraseña</p>
          <p className="text-xs text-slate-400">Tu CURP en mayúsculas — cámbiala con Control Escolar</p>
        </div>
      </div>
    </div>
  )
}
