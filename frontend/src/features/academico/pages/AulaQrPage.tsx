import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { academicoApi } from '../services/academico'
import { usePeriodoActivo } from '../../../hooks/usePeriodoActivo'
import { useAuthStore } from '../../../store/authStore'

const ROLES_REGISTRO_INCIDENCIA = ['superadmin', 'admin', 'personal_administrativo', 'control_escolar',
  'director_academico', 'jefe_carrera']

/**
 * Página que abre quien escanea el QR fijo pegado en la puerta del aula (un QR por
 * salón, no por sesión). Resuelve al vuelo, con la hora del servidor, qué clase
 * debería estar ocurriendo ahí ahora mismo y ofrece la acción correspondiente según
 * el rol de quien escanea:
 *  - Docente que imparte esa clase → acceso directo a pasar lista.
 *  - Prefectura/administrativos → acceso directo a registrar la ronda ya con
 *    grupo/aula resueltos, sin tener que buscarlos a mano.
 */
export default function AulaQrPage() {
  const { aulaId } = useParams<{ aulaId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: periodoActivo } = usePeriodoActivo()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['aula-horario-actual', aulaId, periodoActivo?.id],
    queryFn: () => academicoApi.getHorarioActualAula(aulaId!, { periodo_id: periodoActivo!.id }),
    enabled: !!aulaId && !!periodoActivo?.id,
  })

  const esDocenteDeEstaClase = !!user && data?.carga?.docente_id === user.id
  const puedeRegistrarIncidencia = !!user?.roles.some(r => ROLES_REGISTRO_INCIDENCIA.includes(r))

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full p-6 space-y-5">
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Aula</p>
          <h1 className="text-2xl font-bold text-slate-900">{data?.aula?.nombre ?? '…'}</h1>
        </div>

        {!periodoActivo || isLoading ? (
          <p className="text-center text-sm text-slate-400 py-6">Consultando horario…</p>
        ) : isError ? (
          <p className="text-center text-sm text-red-500 py-6">No se pudo consultar el horario de esta aula.</p>
        ) : !data?.carga ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500">No hay ninguna clase programada aquí en este momento.</p>
            <p className="text-xs text-slate-400 mt-1">{data?.dia_semana} · {data?.hora}</p>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
            <p className="text-sm text-slate-500">Ahora mismo aquí debería estar:</p>
            <p className="text-lg font-semibold text-slate-800">{data.carga.materia?.nombre ?? 'Materia'}</p>
            <p className="text-sm text-slate-600">Grupo {data.grupo?.clave ?? '—'}</p>
            <p className="text-sm text-slate-600">Docente: {data.carga.docente?.name ?? '—'}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {esDocenteDeEstaClase && (
            <button
              onClick={() => navigate('/docente/asistencias')}
              className="w-full px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
            >
              Pasar lista de este grupo
            </button>
          )}
          {puedeRegistrarIncidencia && (
            <button
              onClick={() => {
                const params = new URLSearchParams({ auto: '1' })
                if (data?.grupo?.id) params.set('grupo_id', data.grupo.id)
                if (aulaId) params.set('aula_id', aulaId)
                navigate(`/admin/gestion-academica/incidencias-clase?${params.toString()}`)
              }}
              className="w-full px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-[#15304c]"
            >
              Registrar ronda en esta aula
            </button>
          )}
          {!esDocenteDeEstaClase && !puedeRegistrarIncidencia && (
            <p className="text-center text-xs text-slate-400">Este código es para uso del docente en turno o de prefectura.</p>
          )}
        </div>
      </div>
    </div>
  )
}
