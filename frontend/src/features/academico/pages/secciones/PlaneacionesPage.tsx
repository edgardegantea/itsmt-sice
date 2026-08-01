import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { academicoApi, type EstatusPlaneacion, type PlaneacionDocente } from '../../services/academico'
import { useAuthStore } from '../../../../store/authStore'
import { Th, SkeletonRows, EmptyRow, selectCls, usePeriodos, transicionesPlaneacion } from '../tabs/shared'
import ViewToggle, { useViewMode } from '../../../../components/ui/ViewToggle'

const ESTATUS_COLOR: Record<EstatusPlaneacion, string> = {
  borrador:     'bg-slate-100 text-slate-600',
  enviada_da:   'bg-blue-100 text-blue-700',
  devuelta_da:  'bg-red-100 text-red-700',
  enviada_jc:   'bg-indigo-100 text-indigo-700',
  devuelta_jc:  'bg-red-100 text-red-700',
  liberada:     'bg-green-100 text-green-700',
}
const ESTATUS_LABEL: Record<EstatusPlaneacion, string> = {
  borrador:     'Borrador',
  enviada_da:   'Enviada a Desarrollo Académico',
  devuelta_da:  'Devuelta por Desarrollo Académico',
  enviada_jc:   'Enviada a Jefatura de Carrera',
  devuelta_jc:  'Devuelta por Jefatura de Carrera',
  liberada:     'Liberada',
}

export default function PlaneacionesPage() {
  const roles = useAuthStore(s => s.user?.roles) ?? []
  const navigate = useNavigate()
  const { data: periodos = [] } = usePeriodos()
  const [periodoId, setPeriodoId] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [vista, setVista] = useViewMode('planeaciones')

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

  const pendientesRevision = conteoPorEstatus.enviada_da + conteoPorEstatus.enviada_jc

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="space-y-5">

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
            <div className="flex items-center gap-3 shrink-0">
              {pendientesRevision > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-sm text-yellow-800">
                  <strong>{pendientesRevision}</strong> pendiente{pendientesRevision !== 1 ? 's' : ''} de revisión
                </div>
              )}
              <ViewToggle value={vista} onChange={setVista} />
            </div>
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

        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm"><tbody><SkeletonRows cols={7} /></tbody></table>
          </div>
        ) : planeaciones.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm"><tbody><EmptyRow cols={7} msg="No hay planeaciones." /></tbody></table>
          </div>
        ) : vista === 'lista' ? (
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
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {planeaciones.map(p => (
                  <tr key={p.id} onClick={() => navigate(`/admin/gestion-academica/planeaciones/${p.id}`)} className="hover:bg-blue-50/60 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-medium text-slate-800">{p.docente?.name}</td>
                    <td className="px-4 py-3 text-slate-700">{p.carga_academica?.materia?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.carga_academica?.grupos?.[0]?.clave ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.periodo?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {p.fecha_entrega ? new Date(p.fecha_entrega).toLocaleDateString('es-MX') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[p.estatus]}`}>
                        {ESTATUS_LABEL[p.estatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-medium text-blue-600 whitespace-nowrap">
                        {transicionesPlaneacion(p.estatus, roles).length > 0 ? 'Revisar' : 'Ver detalle'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {planeaciones.map(p => (
              <Link key={p.id} to={`/admin/gestion-academica/planeaciones/${p.id}`} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 hover:border-slate-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-800 truncate">{p.docente?.name}</p>
                  <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_COLOR[p.estatus]}`}>{ESTATUS_LABEL[p.estatus]}</span>
                </div>
                <p className="text-sm text-slate-600">{p.carga_academica?.materia?.nombre ?? '—'}</p>
                <p className="text-xs text-slate-500 font-mono">{p.carga_academica?.grupos?.[0]?.clave ?? '—'} · {p.periodo?.nombre ?? '—'}</p>
                <span className="text-xs font-medium text-blue-600 mt-1">
                  {transicionesPlaneacion(p.estatus, roles).length > 0 ? 'Revisar' : 'Ver detalle'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
