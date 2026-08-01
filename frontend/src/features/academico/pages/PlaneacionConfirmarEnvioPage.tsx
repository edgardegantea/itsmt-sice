import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type PlaneacionDocente } from '../services/academico'
import { mutationError, PlaneacionDetalle } from './tabs/shared'
import { ESTATUS_COLOR, ESTATUS_LABEL } from './planeacionShared'

/** Página de confirmación previa al envío: muestra la instrumentación didáctica completa,
 * tal como quedó capturada (ya autoguardada por el editor), para que el docente la revise
 * de principio a fin antes de enviarla a Desarrollo Académico — un paso deliberado que evita
 * envíos accidentales de una instrumentación aún incompleta o con errores. */
export default function PlaneacionConfirmarEnvioPage() {
  const { cargaId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const periodoId = searchParams.get('periodo') ?? ''
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: misPlaneaciones = [], isLoading } = useQuery({
    queryKey: ['mis-planeaciones', periodoId],
    queryFn: () => academicoApi.getMisPlaneaciones(periodoId ? { periodo_id: periodoId } : undefined),
    enabled: !!periodoId,
  })

  const planeacion = (misPlaneaciones as PlaneacionDocente[]).find(p => p.carga_academica_id === cargaId)

  const textoEnviar = planeacion?.estatus === 'devuelta_da' || planeacion?.estatus === 'devuelta_jc'
    ? 'Finalizar y reenviar a Desarrollo Académico'
    : 'Finalizar y enviar a Desarrollo Académico'

  const mutEnviar = useMutation({
    mutationFn: () => academicoApi.enviarPlaneacion(planeacion!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mis-planeaciones'] })
      navigate(`/docente/planeacion?periodo=${periodoId}`)
    },
  })

  const volver = `/docente/planeacion/${cargaId}?periodo=${periodoId}`

  if (isLoading) {
    return <div className="w-full px-4 sm:px-6 lg:px-8 py-8"><p className="text-sm text-slate-400">Cargando…</p></div>
  }

  if (!planeacion) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-slate-500">No se encontró esta instrumentación didáctica.</p>
        <Link to={`/docente/planeacion?periodo=${periodoId}`} className="text-sm text-blue-600 hover:underline">← Volver a Mis asignaturas</Link>
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-5">
        <Link to={volver} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Regresar a la edición
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{planeacion.carga_academica?.materia?.nombre ?? 'Instrumentación didáctica'}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Confirma que todo el contenido es correcto antes de enviarlo — ya no podrás editarlo mientras esté en revisión.
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ESTATUS_COLOR[planeacion.estatus]}`}>
            {ESTATUS_LABEL[planeacion.estatus]}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <PlaneacionDetalle p={planeacion} />
          {planeacion.archivo_url && (
            <a href={planeacion.archivo_url} target="_blank" rel="noreferrer" className="inline-block text-xs text-blue-600 hover:underline">
              Ver archivo adjunto
            </a>
          )}
        </div>

        {mutEnviar.isError && <p className="text-xs text-red-600">{mutationError(mutEnviar.error)}</p>}

        <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 p-5">
          <Link to={volver} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
            ← Regresar a la edición
          </Link>
          <button
            onClick={() => mutEnviar.mutate()}
            disabled={mutEnviar.isPending}
            className="px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {mutEnviar.isPending ? 'Enviando…' : textoEnviar}
          </button>
        </div>
      </div>
    </div>
  )
}
