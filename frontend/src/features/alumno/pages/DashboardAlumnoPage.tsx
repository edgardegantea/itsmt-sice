import { useQuery } from '@tanstack/react-query'
import { authApi } from '../../auth/services/auth'
import { useAuthStore } from '../../../store/authStore'
import { admisionApi } from '../../admision/services/admision'
import { useCredencialPdf } from '../../admision/hooks/useCredencialPdf'
import { academicoApi, type SituacionAcademica } from '../../academico/services/academico'

const ESTATUS_COLOR: Record<string, string> = {
  activo:        'bg-green-100 text-green-800',
  baja_temporal: 'bg-yellow-100 text-yellow-800',
  baja_definitiva: 'bg-red-100 text-red-800',
  egresado:      'bg-blue-100 text-blue-800',
  titulado:      'bg-purple-100 text-purple-800',
}

const ESTATUS_LABEL: Record<string, string> = {
  activo:        'Activo',
  baja_temporal: 'Baja temporal',
  baja_definitiva: 'Baja definitiva',
  egresado:      'Egresado',
  titulado:      'Titulado',
}

interface AlumnoMe {
  id: string
  name: string
  email: string
  roles: string[]
  numero_control: string
  carrera: string
  semestre: number
  estatus?: string
  pendiente_certificado_bachillerato?: boolean
  periodo_ingreso?: string
  tipo_ingreso?: string
  observaciones_estatus?: string | null
  alumno_id?: string
}

function Stat({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-slate-800 font-semibold text-lg ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

export default function DashboardAlumnoPage() {
  const { user: cachedUser } = useAuthStore()

  // Refresca los datos del alumno desde el servidor
  const { data: me, isLoading } = useQuery<AlumnoMe>({
    queryKey: ['alumno-me'],
    queryFn: () => authApi.me() as unknown as Promise<AlumnoMe>,
    initialData: cachedUser as unknown as AlumnoMe | undefined,
  })

  const { descargar: descargarCredencial, generando: generandoCredencial } = useCredencialPdf()

  const { data: situacion } = useQuery<SituacionAcademica>({
    queryKey: ['situacion-academica', me?.alumno_id],
    queryFn: () => academicoApi.getSituacionAcademica(me!.alumno_id!),
    enabled: !!me?.alumno_id,
  })

  const handleCredencial = async () => {
    if (!me?.alumno_id) return
    const alumno = await admisionApi.getAlumno(me.alumno_id)
    await descargarCredencial(alumno)
  }

  if (isLoading && !me) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
        Cargando tu información…
      </div>
    )
  }

  const estatus = me?.estatus ?? 'activo'

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Bienvenida */}
      <div className="bg-[#1a3a5c] rounded-2xl px-6 py-7 text-white">
        <p className="text-white/50 text-sm mb-1">Bienvenido/a de regreso</p>
        <h1 className="text-2xl font-semibold leading-tight">{me?.name}</h1>
        <p className="text-white/60 text-sm mt-2 font-mono">{me?.numero_control}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {me?.estatus && (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ESTATUS_COLOR[estatus] ?? 'bg-slate-100 text-slate-600'}`}>
              {ESTATUS_LABEL[estatus] ?? estatus}
            </span>
          )}
          {me?.pendiente_certificado_bachillerato && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Cert. bachillerato pendiente
            </span>
          )}
        </div>
      </div>

      {/* Datos académicos */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Datos académicos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Carrera" value={me?.carrera ?? '—'} />
          <Stat label="Semestre actual" value={me?.semestre ? `${me.semestre}°` : '—'} />
          <Stat label="Número de control" value={me?.numero_control ?? '—'} mono />
          <Stat label="Periodo de ingreso" value={me?.periodo_ingreso ?? '—'} />
        </div>
        {me?.tipo_ingreso && (
          <p className="mt-2 text-xs text-slate-400">
            Tipo de ingreso: <span className="capitalize text-slate-600">{me.tipo_ingreso.replace(/_/g, ' ')}</span>
          </p>
        )}
      </section>

      {/* Credencial */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Documentos</h2>
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Credencial de estudiante</p>
            <p className="text-xs text-slate-400 mt-0.5">Formato digital · TecNM</p>
          </div>
          <button
            onClick={handleCredencial}
            disabled={!!generandoCredencial || !me?.alumno_id}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primario)' }}
          >
            {generandoCredencial ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
      </section>

      {/* Calificaciones */}
      {situacion && situacion.calificaciones.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Mis calificaciones</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Materia</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Periodo</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Promedio</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {situacion.calificaciones.map(cal => {
                  const materia = cal.grupo?.cargas?.[0]?.materia?.nombre ?? '—'
                  const periodo = cal.grupo?.periodo?.nombre ?? '—'
                  return (
                    <tr key={cal.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-800 font-medium">{materia}</td>
                      <td className="px-4 py-2.5 text-center text-slate-500 text-xs">{periodo}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-slate-800">
                        {cal.promedio ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {cal.acreditado === true && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Acreditado</span>
                        )}
                        {cal.acreditado === false && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">No acreditado</span>
                        )}
                        {(cal.acreditado === null || cal.acreditado === undefined) && (
                          <span className="text-slate-400 text-xs">Pendiente</span>
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

      {/* Observaciones (si las hay) */}
      {me?.observaciones_estatus && (
        <section className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
          <p className="text-sm font-medium text-yellow-800 mb-1">Nota de Control Escolar</p>
          <p className="text-xs text-yellow-700">{me.observaciones_estatus}</p>
        </section>
      )}

      {/* Contacto */}
      <section className="bg-white rounded-xl border border-slate-200 px-5 py-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">Contacto</p>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 w-20 text-xs">Correo</span>
            <span>{me?.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 w-20 text-xs">Contraseña</span>
            <span className="text-xs text-slate-400">Tu CURP en mayúsculas — cámbiala con Control Escolar</span>
          </div>
        </div>
      </section>
    </div>
  )
}
