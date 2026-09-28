import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { academicoApi, mergeCargasPorAsignatura } from '../../services/academico'
import { useAuthStore } from '../../../../store/authStore'
import { CalificacionesSection } from './CalificacionesPage'

/**
 * Página dedicada a la captura de calificaciones de UNA materia dentro de UN grupo
 * (equivalente a "abrir" la asignatura elegida en el listado de `CalificacionesPage`).
 * Vive en su propia URL — enlazable, recargable y navegable con atrás/adelante —
 * en vez de mostrarse embebida bajo el selector de grupos.
 */
export default function CapturaCalificacionesPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const grupoId = searchParams.get('grupo_id')
  const cargaId = searchParams.get('carga_id')
  const periodoId = searchParams.get('periodo_id') ?? ''
  const unidadParam = searchParams.get('unidad')
  const unidadDestacada = unidadParam ? Number(unidadParam) : null
  // Si se llegó aquí desde otra pantalla (p. ej. "Calendarización de evaluación" de una
  // planeación), "volver" trae la URL exacta a la que hay que regresar en vez del
  // listado genérico de grupos.
  const volverA = searchParams.get('volver')

  const esDocente = !!user?.roles.includes('docente') && !user?.roles.some(r => ['superadmin', 'admin'].includes(r))
  const puedeAdministrar = !!user?.roles.some(r => ['superadmin', 'admin', 'jefe_carrera', 'director_academico', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'].includes(r))
  // La calificación final se deriva normalmente de los parciales — solo el superadmin
  // puede capturarla/editarla directamente, para casos excepcionales (equivalencias,
  // revalidaciones, correcciones manuales) que no deben quedar al alcance del docente.
  const puedeEditarFinal = !!user?.roles.includes('superadmin')
  const puedeFirmar = !!user?.roles.some(r => ['superadmin', 'admin'].includes(r))
  const puedeVerHistorial = !!user?.roles.some(r => [
    'superadmin', 'admin', 'desarrollo_academico', 'jefe_carrera', 'control_escolar',
    'subdireccion_academica', 'director_academico', 'direccion_academica', 'direccion_general',
  ].includes(r))

  const rutaListado = esDocente ? '/docente/calificaciones' : '/admin/gestion-academica/calificaciones'

  const { data: grupo, isLoading: cargandoGrupo } = useQuery({
    queryKey: ['grupo-detalle-calificaciones', grupoId],
    queryFn: () => academicoApi.getGrupo(grupoId!),
    enabled: !!grupoId,
  })

  // Misma fusión que en el listado — el id de la materia clicada ahí ya es el
  // "canónico" tras fusionar, así que debe resolverse aquí de la misma forma.
  const carga = mergeCargasPorAsignatura(grupo?.cargas ?? []).find(c => c.id === cargaId)

  if (!grupoId || !cargaId) {
    return (
      <div className="min-h-full bg-slate-50 p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-400 text-sm">Falta indicar el grupo y la materia a capturar.</p>
          <button
            onClick={() => navigate(volverA || (periodoId ? `${rutaListado}?periodo_id=${periodoId}` : rutaListado))}
            className="mt-3 text-sm text-brand-600 hover:underline"
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  // Ficha de identificación completa — para que quien captura sepa siempre en qué
  // asignatura, carrera, semestre, grupo y periodo está, sin tener que volver al listado.
  const datosIdentificacion = grupo && [
    { etiqueta: 'Carrera', valor: grupo.carrera?.nombre },
    { etiqueta: 'Semestre', valor: grupo.semestre ? `${grupo.semestre}°` : undefined },
    { etiqueta: 'Grupo', valor: grupo.clave },
    { etiqueta: 'Periodo', valor: grupo.periodo?.nombre },
    { etiqueta: 'Docente', valor: carga?.docente?.name },
  ].filter(d => d.valor)

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">
        <div>
          <button
            onClick={() => navigate(volverA || (periodoId ? `${rutaListado}?periodo_id=${periodoId}` : rutaListado))}
            className="text-sm text-slate-500 hover:text-brand-600 mb-2 inline-flex items-center gap-1"
          >
            ← Volver
          </button>
          <h1 className="text-xl font-bold text-slate-900">
            Captura de Calificaciones
            {carga?.materia?.nombre && <span className="text-slate-500 font-normal"> · {carga.materia.nombre}</span>}
          </h1>
        </div>

        {grupo && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-x-6 gap-y-2">
            {datosIdentificacion?.map(d => (
              <div key={d.etiqueta}>
                <div className="text-[11px] text-slate-400 uppercase tracking-wide">{d.etiqueta}</div>
                <div className="text-sm font-medium text-slate-800">{d.valor}</div>
              </div>
            ))}
          </div>
        )}

        {cargandoGrupo || !grupo ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">Cargando…</p>
          </div>
        ) : !carga ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">Esta materia ya no está asignada a este grupo.</p>
          </div>
        ) : (
          <CalificacionesSection
            grupoId={grupo.id}
            alumnos={grupo.alumnos ?? []}
            cargas={grupo.cargas ?? []}
            currentUserId={user?.id}
            periodoId={grupo.periodo_id}
            periodoActivo={grupo.periodo?.activo ?? true}
            esDocente={esDocente}
            puedeFirmar={puedeFirmar || (puedeAdministrar && !esDocente)}
            cargaPreseleccionadaId={cargaId}
            unidadDestacada={unidadDestacada}
            puedeEditarFinal={puedeEditarFinal}
            puedeVerHistorial={puedeVerHistorial}
          />
        )}
      </div>
    </div>
  )
}
