import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import { academicoApi, type SituacionAcademica } from '../../academico/services/academico'
import apiClient from '../../../config/apiClient'
import { openPdfPreview } from '../../../utils/pdfHelpers'
import { useToastStore } from '../../../store/toastStore'
import { ChevronRight, IdCard } from 'lucide-react'

const ESTATUS_COLOR: Record<string, string> = {
  activo:          'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  baja_temporal:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  baja_definitiva: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  egresado:        'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
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

function formatCarrera(carrera: unknown): string {
  if (!carrera) return '—'
  if (typeof carrera === 'string') return carrera
  if (typeof carrera === 'object' && carrera !== null) {
    const obj = carrera as Record<string, unknown>
    if (typeof obj.nombre === 'string') return obj.nombre
    if (typeof obj.nombre_carrera === 'string') return obj.nombre_carrera
    if (typeof obj.clave === 'string') return obj.clave
  }
  return '—'
}

export default function DashboardAlumnoPage() {
  const { user } = useAuthStore()
  const { toast } = useToastStore()
  const [generandoCredencial, setGenerandoCredencial] = useState(false)

  const { data: situacion } = useQuery<SituacionAcademica>({
    queryKey: ['situacion-academica', user?.alumno_id],
    queryFn: () => academicoApi.getSituacionAcademica(user!.alumno_id!),
    enabled: !!user?.alumno_id,
    staleTime: 5 * 60 * 1000,
  })

  const estatus = user?.estatus ?? 'activo'

  async function handleCredencial() {
    setGenerandoCredencial(true)
    toast('Generando credencial…', 'info')
    try {
      const response = await apiClient.get('/alumno/mi-credencial/pdf', { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      openPdfPreview(blob, `credencial-${user?.numero_control ?? 'alumno'}.pdf`)
      toast('Credencial generada correctamente.', 'success')
    } catch {
      toast('No se pudo generar la credencial. Intenta de nuevo.', 'error')
    } finally {
      setGenerandoCredencial(false)
    }
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 max-w-7xl mx-auto">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="card-ejecutiva p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-brand-600/5 via-[#b38e5d]/5 to-transparent rounded-full pointer-events-none -mr-16 -mt-16" />
        <div className="relative z-10 space-y-1.5">
          <p className="text-[11px] text-[#b38e5d] font-semibold uppercase tracking-widest">
            Portal del Estudiante · TecNM
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-800 tracking-tight">
            Bienvenido/a, {user?.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              N/C: {user?.numero_control}
            </span>
            {user?.estatus && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
                {ESTATUS_LABEL[estatus] ?? estatus}
              </span>
            )}
            {user?.pendiente_certificado_bachillerato && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 ring-1 ring-amber-300/60">
                Cert. bachillerato pendiente
              </span>
            )}
          </div>
        </div>

        {/* Credencial */}
        <button
          onClick={handleCredencial}
          disabled={generandoCredencial || !user?.alumno_id}
          className="relative z-10 shrink-0 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-xs font-semibold text-white shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 active:scale-95 cursor-pointer"
          style={{ backgroundColor: 'var(--color-primario, #1b396a)' }}
        >
          <IdCard className="w-4 h-4 text-[#b38e5d]" aria-hidden="true" />
          {generandoCredencial ? 'Generando…' : 'Credencial Oficial PDF'}
        </button>
      </div>

      {/* ── Datos académicos ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Carrera',          value: formatCarrera(user?.carrera), mono: false, accent: 'blue' },
          { label: 'Semestre',         value: user?.semestre ? `${user.semestre}° Semestre` : '—', mono: false, accent: 'gold' },
          { label: 'Número de Control', value: user?.numero_control ?? '—', mono: true, accent: 'blue' },
          { label: 'Periodo Ingreso',  value: user?.periodo_ingreso ?? '—', mono: false, accent: 'gold' },
        ].map(item => (
          <div key={item.label} className={item.accent === 'gold' ? 'card-institucional-dorado p-4' : 'card-institucional p-4'}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
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
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Resumen de Calificaciones
            </h2>
          </div>
          <div className="card-ejecutiva overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Materia</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Periodo</th>
                  <th className="px-5 py-3.5 text-center text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Calificación</th>
                  <th className="px-5 py-3.5 text-center text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {situacion.calificaciones.map(cal => {
                  const materia = cal.grupo?.cargas?.[0]?.materia?.nombre ?? '—'
                  const periodo = cal.grupo?.periodo?.nombre ?? '—'
                  return (
                    <tr key={cal.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 text-slate-800 font-medium">{materia}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs hidden sm:table-cell">{periodo}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-slate-900">
                        {cal.promedio ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {cal.acreditado === true && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block">
                            Acreditado
                          </span>
                        )}
                        {cal.acreditado === false && (
                          <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full inline-block">
                            No acreditado
                          </span>
                        )}
                        {(cal.acreditado === null || cal.acreditado === undefined) && (
                          <span className="text-[11px] text-slate-400 font-medium">Pendiente</span>
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
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Accesos Rápidos al Portal
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACCESOS_RAPIDOS.map(({ to, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="group card-ejecutiva p-5 flex flex-col justify-between hover:border-[#b38e5d]/40 transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-brand-800 group-hover:text-brand-600 transition-colors">
                    {label}
                  </p>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#b38e5d] group-hover:translate-x-0.5 transition-all" strokeWidth={2} aria-hidden="true" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Alerta observaciones ─────────────────────────────────────── */}
      {user?.observaciones_estatus && (
        <div className="card-institucional-dorado bg-amber-50/50 p-5">
          <p className="text-xs font-bold text-amber-900 mb-1">Aviso de Control Escolar</p>
          <p className="text-sm text-amber-800 leading-relaxed">{user.observaciones_estatus}</p>
        </div>
      )}

      {/* ── Contacto ─────────────────────────────────────────────────── */}
      <div className="card-ejecutiva p-5 flex flex-wrap gap-8 items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Correo institucional</p>
          <p className="text-sm font-medium text-slate-800">{user?.email}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Acceso al portal</p>
          <p className="text-xs text-slate-500">Tu contraseña inicial es tu CURP en mayúsculas.</p>
        </div>
      </div>
    </div>
  )
}
