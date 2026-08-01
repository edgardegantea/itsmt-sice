import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { academicoApi, mergeCargasPorAsignatura, type CargaAcademica } from '../services/academico'
import PaseAsistenciaGrupo, { type PeriodoRango } from './PaseAsistenciaGrupo'
import { useAuthStore } from '../../../store/authStore'
import apiClient from '../../../config/apiClient'

interface LocationState {
  carga?: CargaAcademica
  periodo?: PeriodoRango
}

export default function PaseListaPage() {
  const { cargaId } = useParams<{ cargaId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const state = (location.state ?? {}) as LocationState

  const periodoIdFallback = new URLSearchParams(location.search).get('periodo') ?? ''

  // Un rol de gestión (superadmin, admin, jefe_carrera…) debe poder abrir el pase de
  // lista de cualquier docente (p. ej. para cubrir una ausencia); solo se restringe
  // por docente_id cuando el usuario es puramente docente.
  const roles = user?.roles ?? []
  const esSoloDocente = roles.includes('docente') &&
    !roles.some(r => ['superadmin', 'admin', 'jefe_carrera', 'director_academico', 'control_escolar', 'direccion_general', 'direccion_academica', 'subdireccion_academica'].includes(r))

  // Ruta rápida: la carga y el periodo ya llegaron por navegación desde el listado.
  // Si la página se recarga o se abre directo, se refetch por periodo (y por docente
  // si el usuario no tiene un rol de gestión) y se busca la carga por id.
  const necesitaFetch = !state.carga || !state.periodo
  const { data: cargas = [], isLoading: cargandoCargas } = useQuery({
    queryKey: ['cargas-pase-lista-fallback', periodoIdFallback, user?.id, esSoloDocente],
    queryFn: () => academicoApi.getCargas(
      esSoloDocente ? { docente_id: user!.id, periodo_id: periodoIdFallback } : { periodo_id: periodoIdFallback }
    ),
    enabled: necesitaFetch && !!periodoIdFallback && !!user?.id,
  })

  const { data: periodos = [], isLoading: cargandoPeriodos } = useQuery({
    queryKey: ['periodos-pase-lista-fallback'],
    queryFn: () => apiClient.get('/admin/periodos').then(r => r.data.data as PeriodoRango[]),
    enabled: necesitaFetch && !!periodoIdFallback,
  })

  // Mismo criterio de fusión que en el listado: varias CargaAcademica pueden
  // representar la misma asignatura repartida en distintos días, y todas deben
  // resolver al mismo id "canónico" para que las sesiones queden consistentes.
  const carga = state.carga ?? mergeCargasPorAsignatura(cargas).find(c => c.id === cargaId)
  const grupo = carga?.grupos?.[0]
  const periodo = state.periodo ?? periodos.find(p => p.id === periodoIdFallback)
  const isLoading = cargandoCargas || cargandoPeriodos

  return (
    <div className="min-h-full bg-slate-50 p-3 sm:p-6">
      <div className="space-y-4 sm:space-y-5">
        <div>
          <button
            onClick={() => navigate('/admin/gestion-academica/asistencias')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Asistencias
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            Pase de lista{carga?.materia ? `: ${carga.materia.nombre}` : ''}
          </h1>
          {grupo && (
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Grupo {grupo.clave} · {grupo.carrera?.nombre} · {grupo.semestre}° semestre
              {carga?.docente ? ` · Docente: ${carga.docente.name}` : ''}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
          {necesitaFetch && isLoading ? (
            <p className="text-sm text-slate-400">Cargando información de la materia…</p>
          ) : !carga || !grupo || !periodo ? (
            <p className="text-sm text-red-500">
              No se pudo cargar esta materia. Regresa a Asistencias y vuelve a elegirla.
            </p>
          ) : (
            <PaseAsistenciaGrupo key={grupo.id} carga={carga} grupo={grupo} periodo={periodo} />
          )}
        </div>
      </div>
    </div>
  )
}
