import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { academicoApi, type PlaneacionDocente, type EstatusPlaneacion } from '../../services/academico'
import { Th, SkeletonRows, EmptyRow, selectCls, mutationError, usePeriodos } from '../tabs/shared'

const ESTATUS_COLOR: Record<EstatusPlaneacion, string> = {
  borrador:  'bg-slate-100 text-slate-600',
  entregada: 'bg-blue-100 text-blue-700',
  revisada:  'bg-yellow-100 text-yellow-700',
  liberada:  'bg-green-100 text-green-700',
  devuelta:  'bg-red-100 text-red-700',
}
const ESTATUS_LABEL: Record<EstatusPlaneacion, string> = {
  borrador: 'Borrador', entregada: 'Entregada', revisada: 'Revisada', liberada: 'Liberada', devuelta: 'Devuelta',
}

function RevisionModal({ planeacion, onClose }: { planeacion: PlaneacionDocente; onClose: () => void }) {
  const qc = useQueryClient()
  const [estatus, setEstatus] = useState<'revisada' | 'liberada' | 'devuelta'>('revisada')
  const [obs, setObs] = useState(planeacion.observaciones_revision ?? '')

  const mutCambiar = useMutation({
    mutationFn: () => academicoApi.cambiarEstatusPlaneacion(planeacion.id, estatus, obs),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planeaciones-admin'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Revisar planeación</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-slate-700">{planeacion.carga_academica?.materia?.nombre}</p>
            <p className="text-xs text-slate-500 mt-0.5">Docente: {planeacion.docente?.name} · Grupo: {planeacion.carga_academica?.grupo?.clave}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nuevo estatus *</label>
            <select value={estatus} onChange={e => setEstatus(e.target.value as 'revisada' | 'liberada' | 'devuelta')} className={selectCls}>
              <option value="revisada">Revisada — en proceso</option>
              <option value="liberada">Liberada — aprobada</option>
              <option value="devuelta">Devuelta — requiere correcciones</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
            <textarea
              rows={3}
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Indica al docente qué debe corregir o mejorar…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          {mutCambiar.isError && <p className="text-xs text-red-600">{mutationError(mutCambiar.error)}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button
            onClick={() => mutCambiar.mutate()}
            disabled={mutCambiar.isPending}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutCambiar.isPending ? 'Guardando…' : 'Guardar revisión'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PlaneacionesPage() {
  const { data: periodos = [] } = usePeriodos()
  const [periodoId, setPeriodoId] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [revisando, setRevisando] = useState<PlaneacionDocente | null>(null)

  const params: Record<string, string> = {}
  if (periodoId) params.periodo_id = periodoId
  if (filtroEstatus) params.estatus = filtroEstatus

  const { data, isLoading } = useQuery({
    queryKey: ['planeaciones-admin', params],
    queryFn: () => academicoApi.getPlaneaciones(params),
  })

  const planeaciones: PlaneacionDocente[] = data?.data ?? []

  const conteoPorEstatus = (Object.keys(ESTATUS_LABEL) as EstatusPlaneacion[]).reduce((acc, e) => {
    acc[e] = planeaciones.filter(p => p.estatus === e).length
    return acc
  }, {} as Record<EstatusPlaneacion, number>)

  const pendientesRevision = conteoPorEstatus.entregada + conteoPorEstatus.revisada

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <Link to="/admin/gestion-academica" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Gestión Académica
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Planeaciones Didácticas</h1>
              <p className="text-sm text-slate-500 mt-0.5">Seguimiento y revisión de planeaciones entregadas por docentes</p>
            </div>
            {pendientesRevision > 0 && (
              <div className="shrink-0 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-sm text-yellow-800">
                <strong>{pendientesRevision}</strong> pendiente{pendientesRevision !== 1 ? 's' : ''} de revisión
              </div>
            )}
          </div>
        </div>

        {/* Resumen por estatus */}
        {planeaciones.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ESTATUS_LABEL) as EstatusPlaneacion[]).map(e => (
              <button
                key={e}
                onClick={() => setFiltroEstatus(filtroEstatus === e ? '' : e)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtroEstatus === e ? ESTATUS_COLOR[e] + ' ring-2 ring-offset-1 ring-current' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {ESTATUS_LABEL[e]}
                {conteoPorEstatus[e] > 0 && (
                  <span className="ml-1.5 font-bold">{conteoPorEstatus[e]}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-44">
            <label className="block text-xs font-medium text-slate-600 mb-1">Periodo</label>
            <select value={periodoId} onChange={e => setPeriodoId(e.target.value)} className={selectCls}>
              <option value="">Todos</option>
              {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (activo)' : ''}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-44">
            <label className="block text-xs font-medium text-slate-600 mb-1">Estatus</label>
            <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)} className={selectCls}>
              <option value="">Todos</option>
              {(Object.keys(ESTATUS_LABEL) as EstatusPlaneacion[]).map(e => (
                <option key={e} value={e}>{ESTATUS_LABEL[e]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Docente</Th>
                <Th>Materia</Th>
                <Th>Grupo</Th>
                <Th>Periodo</Th>
                <Th>Entregada</Th>
                <Th>Estatus</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <SkeletonRows cols={7} />
              ) : planeaciones.length === 0 ? (
                <EmptyRow cols={7} msg="No hay planeaciones." />
              ) : (
                planeaciones.map(p => (
                  <tr key={p.id} className="hover:bg-blue-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{p.docente?.name}</td>
                    <td className="px-4 py-3 text-slate-700">{p.carga_academica?.materia?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.carga_academica?.grupo?.clave ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.periodo?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {p.fecha_entrega ? new Date(p.fecha_entrega).toLocaleDateString('es-MX') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[p.estatus]}`}>
                        {ESTATUS_LABEL[p.estatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        {p.archivo_url && (
                          <a href={p.archivo_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                            Ver archivo
                          </a>
                        )}
                        {(p.estatus === 'entregada' || p.estatus === 'revisada') && (
                          <button onClick={() => setRevisando(p)} className="text-xs text-green-700 hover:underline font-medium">
                            {p.estatus === 'entregada' ? 'Revisar' : 'Actualizar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {revisando && <RevisionModal planeacion={revisando} onClose={() => setRevisando(null)} />}
    </div>
  )
}
