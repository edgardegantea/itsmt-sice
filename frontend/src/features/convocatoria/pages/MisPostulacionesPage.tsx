import { useQuery } from '@tanstack/react-query'
import { academicoApi as academico } from '../../academico/services/academico'
import type { PostulacionEstatus } from '../../academico/services/academico'
import { useAuthStore } from '../../../store/authStore'

const ESTATUS_LABELS: Record<PostulacionEstatus, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En Revisión',
  admitido: 'Admitido',
  no_admitido: 'No Admitido',
}

const ESTATUS_COLORS: Record<PostulacionEstatus, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  en_revision: 'bg-blue-100 text-blue-700',
  admitido: 'bg-green-100 text-green-700',
  no_admitido: 'bg-red-100 text-red-700',
}

const TIPO_LABELS: Record<string, string> = {
  beca: 'Beca',
  movilidad: 'Movilidad',
  ss: 'Servicio Social',
  curso_verano: 'Curso Verano',
  concurso: 'Concurso',
  bolsa_trabajo: 'Bolsa de Trabajo',
  otro: 'Otro',
}

export default function MisPostulacionesPage() {
  const { user } = useAuthStore()

  const { data: postulaciones = [], isLoading } = useQuery({
    queryKey: ['mis-postulaciones', user?.id],
    queryFn: () => academico.getMisPostulaciones(user!.id),
    enabled: !!user?.id,
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Postulaciones</h1>
        <p className="text-sm text-gray-500 mt-1">Historial de tus postulaciones a convocatorias institucionales</p>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : postulaciones.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No tienes postulaciones registradas.
        </div>
      ) : (
        <div className="space-y-3">
          {postulaciones.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{p.convocatoria?.titulo ?? '—'}</h3>
                  <div className="text-xs text-gray-500 mt-0.5 space-x-3">
                    {p.convocatoria?.tipo && (
                      <span>{TIPO_LABELS[p.convocatoria.tipo] ?? p.convocatoria.tipo}</span>
                    )}
                    <span>Postulado: {new Date(p.fecha_postulacion).toLocaleDateString('es-MX')}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ESTATUS_COLORS[p.estatus]}`}>
                  {ESTATUS_LABELS[p.estatus]}
                </span>
              </div>
              {p.observaciones && (
                <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium">Observaciones:</span> {p.observaciones}
                </p>
              )}
              {p.revisadoPor && (
                <p className="mt-1 text-xs text-gray-400">Revisado por: {p.revisadoPor.name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
