import { useQuery } from '@tanstack/react-query'
import { authApi } from '../../auth/services/auth'
import { useAuthStore } from '../../../store/authStore'
import { admisionApi } from '../../admision/services/admision'
import { useCredencialPdf } from '../../admision/hooks/useCredencialPdf'

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
    queryFn: () => authApi.me() as Promise<AlumnoMe>,
    initialData: cachedUser as AlumnoMe | undefined,
  })

  const { descargar: descargarCredencial, generando: generandoCredencial } = useCredencialPdf()

  const handleCredencial = async () => {
    if (!me?.alumno_id) return
    try {
      const alumno = await admisionApi.getAlumno(me.alumno_id)
      await descargarCredencial(alumno)
    } catch {
      alert('No se pudo generar la credencial. Intenta más tarde.')
    }
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label="Carrera" value={me?.carrera ?? '—'} />
          <Stat label="Semestre" value={me?.semestre ? `${me.semestre}°` : '—'} />
          <Stat label="Número de control" value={me?.numero_control ?? '—'} mono />
        </div>
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
