import { Link } from 'react-router-dom'

interface SeccionCard {
  titulo: string
  descripcion: string
  ruta: string
  icono: React.ReactNode
}

function IconBook() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function IconGrid() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconBuilding() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4" />
    </svg>
  )
}

function IconClipboard() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconHeart() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function IconBadge() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="12" cy="8" r="6" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}

const SECCIONES: SeccionCard[] = [
  {
    titulo: 'Docentes',
    descripcion: 'Gestiona los datos institucionales del personal docente: clave, nombramiento, tipo de horas y horario.',
    ruta: '/admin/gestion-academica/docentes',
    icono: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    titulo: 'Materias',
    descripcion: 'Administra el catálogo de materias por carrera, semestre y tipo.',
    ruta: '/admin/gestion-academica/materias',
    icono: <IconBook />,
  },
  {
    titulo: 'Malla Curricular',
    descripcion: 'Define qué materias pertenecen a cada semestre de cada carrera.',
    ruta: '/admin/gestion-academica/malla',
    icono: <IconGrid />,
  },
  {
    titulo: 'Grupos',
    descripcion: 'Gestiona grupos escolares, asigna alumnos y consulta detalles.',
    ruta: '/admin/gestion-academica/grupos',
    icono: <IconUsers />,
  },
  {
    titulo: 'Aulas',
    descripcion: 'Administra los espacios físicos disponibles: salones, labs y talleres.',
    ruta: '/admin/gestion-academica/aulas',
    icono: <IconBuilding />,
  },
  {
    titulo: 'Cargas Académicas',
    descripcion: 'Asigna docentes a materias y grupos para el periodo activo.',
    ruta: '/admin/gestion-academica/cargas',
    icono: <IconClipboard />,
  },
  {
    titulo: 'Horarios',
    descripcion: 'Configura los bloques horarios de cada carga académica.',
    ruta: '/admin/gestion-academica/horarios',
    icono: <IconClock />,
  },
  {
    titulo: 'Planeaciones',
    descripcion: 'Revisa y gestiona las planeaciones didácticas de los docentes.',
    ruta: '/admin/gestion-academica/planeaciones',
    icono: <IconCalendar />,
  },
  {
    titulo: 'Tutorías',
    descripcion: 'Administra la asignación de tutores a alumnos por periodo.',
    ruta: '/admin/gestion-academica/tutorias',
    icono: <IconHeart />,
  },
  {
    titulo: 'Funciones del Personal',
    descripcion: 'Registra las funciones y roles del personal académico.',
    ruta: '/admin/gestion-academica/funciones',
    icono: <IconBadge />,
  },
]

export default function GestionAcademicaIndexPage() {
  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión Académica</h1>
          <p className="text-slate-500 text-sm mt-1">Selecciona una sección para administrar</p>
        </div>

        {/* Grid de tarjetas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECCIONES.map((s) => (
            <Link
              key={s.ruta}
              to={s.ruta}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 hover:shadow-md hover:border-slate-300 transition-all duration-150 group"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                {s.icono}
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-sm">{s.titulo}</h2>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">{s.descripcion}</p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-xs text-blue-600 font-medium group-hover:gap-2 transition-all">
                Ir a {s.titulo}
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
