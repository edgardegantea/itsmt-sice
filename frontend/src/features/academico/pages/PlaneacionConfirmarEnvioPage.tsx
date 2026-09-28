import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type PlaneacionDocente } from '../services/academico'
import { mutationError, PlaneacionDetalle } from './tabs/shared'
import { EstatusBadge } from './planeacionShared'

/** Checklist de validación mostrado antes del documento completo — para que el docente vea
 * de un vistazo qué secciones están listas sin tener que leer todo el contenido primero. */
function itemsChecklist(p: PlaneacionDocente) {
  const numUnidades = p.competencias?.length ?? 0
  return [
    { id: 'seccion-caracterizacion', label: 'Caracterización de la asignatura', ok: !!p.caracterizacion?.trim() },
    { id: 'seccion-intencion', label: 'Intención didáctica', ok: !!p.intencion_didactica?.trim() },
    { id: 'seccion-competencia', label: 'Competencia de la asignatura', ok: !!p.competencia_asignatura?.trim() },
    { id: 'seccion-especificas', label: `Análisis por competencias específicas${numUnidades ? ` (${numUnidades} unidad${numUnidades === 1 ? '' : 'es'})` : ''}`, ok: numUnidades > 0 },
    { id: 'seccion-calendarizacion', label: 'Calendarización de evaluación', ok: numUnidades > 0 },
  ]
}

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
  const checklist = planeacion ? itemsChecklist(planeacion) : []
  const irA = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-b from-slate-50 via-white to-white min-h-screen -mt-8 pt-8" data-modulo-planeacion>
      <div className="space-y-5">
        <Link to={volver} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Regresar a la edición
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/70 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#1a3a5c] via-sky-500 to-emerald-400" />
          <div className="flex items-start justify-between gap-4 p-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{planeacion.carga_academica?.materia?.nombre ?? 'Instrumentación didáctica'}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Confirma que todo el contenido es correcto antes de enviarlo — ya no podrás editarlo mientras esté en revisión.
              </p>
            </div>
            <EstatusBadge estatus={planeacion.estatus} />
          </div>
        </div>

        {/* Checklist de validación — para ver de un vistazo qué falta antes de leer todo el
            documento; cada fila salta a su sección correspondiente al hacer clic. */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm shadow-slate-200/60 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Checklist antes de enviar</p>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {checklist.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => irA(item.id)}
                className="flex items-center gap-2 text-left text-sm py-0.5 group"
              >
                <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${item.ok ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                  {item.ok ? (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008" /></svg>
                  )}
                </span>
                <span className={`group-hover:underline ${item.ok ? 'text-slate-600' : 'text-amber-700 font-medium'}`}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:flex lg:items-start lg:gap-5">
          <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm shadow-slate-200/60 p-5 space-y-4">
            <PlaneacionDetalle p={planeacion} />
            {planeacion.archivo_url && (
              <a href={planeacion.archivo_url} target="_blank" rel="noreferrer" className="inline-block text-xs text-blue-600 hover:underline">
                Ver archivo adjunto
              </a>
            )}
          </div>

          {/* Índice de navegación — solo en pantallas grandes; en chico basta con el
              checklist de arriba para saltar a una sección. */}
          <div className="hidden lg:block w-52 shrink-0 sticky top-4 self-start">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm shadow-slate-200/60 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-1.5 mb-1">Índice</p>
              <nav className="space-y-0.5">
                {checklist.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => irA(item.id)}
                    className="block w-full text-left text-xs px-1.5 py-1 rounded-md text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors truncate"
                  >
                    {item.label}
                  </button>
                ))}
                {(planeacion.competencias ?? []).map(c => (
                  <button
                    key={c.numero}
                    type="button"
                    onClick={() => irA(`unidad-${c.numero}`)}
                    className="block w-full text-left text-xs px-1.5 py-1 pl-4 rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors truncate"
                  >
                    Unidad {c.numero}{c.nombre_unidad ? ` — ${c.nombre_unidad}` : ''}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {mutEnviar.isError && <p className="text-xs text-red-600">{mutationError(mutEnviar.error)}</p>}

        <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 shadow-sm shadow-slate-200/60 p-5 sticky bottom-4">
          <Link to={volver} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            ← Regresar a la edición
          </Link>
          <button
            onClick={() => mutEnviar.mutate()}
            disabled={mutEnviar.isPending}
            className="px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-sm shadow-green-600/30 hover:bg-green-700 hover:shadow-md transition-all disabled:opacity-50"
          >
            {mutEnviar.isPending ? 'Enviando…' : textoEnviar}
          </button>
        </div>
      </div>
    </div>
  )
}
