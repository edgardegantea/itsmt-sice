import { Link } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'

const ACCESOS_RAPIDOS = [
  { to: '/docente/mi-horario',      label: 'Mi Horario',              desc: 'Consulta tus horas de clase asignadas' },
  { to: '/docente/disponibilidad',  label: 'Mi Disponibilidad',       desc: 'Registra tus horarios disponibles' },
  { to: '/docente/planeacion',      label: 'Mi Planeación',           desc: 'Instrumentación didáctica de tus materias' },
  { to: '/docente/calificaciones',  label: 'Captura de Calificaciones', desc: 'Registra las calificaciones de tus grupos' },
  { to: '/docente/asistencias',     label: 'Captura de Asistencia',   desc: 'Pasa lista con fechas precargadas y QR' },
  { to: '/docente/mi-cv',           label: 'Mi CV',                   desc: 'Actualiza tu currículum docente' },
]

export default function DashboardDocentePage() {
  const { user } = useAuthStore()

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Hola, {user?.name ?? 'Docente'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Bienvenido a tu portal docente.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACCESOS_RAPIDOS.map(a => (
            <Link
              key={a.to}
              to={a.to}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-[#1a3a5c] hover:shadow-sm transition-all"
            >
              <p className="font-medium text-slate-800">{a.label}</p>
              <p className="text-xs text-slate-500 mt-1">{a.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
